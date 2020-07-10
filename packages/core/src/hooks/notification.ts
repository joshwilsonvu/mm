import { useEffect, useRef, useMemo } from "react";
import mitt from "mitt";
import io from "socket.io-client";

const emitter = mitt() as Emitter;

/**
 * To subscribe to a notification, call this hook with the name of the notification
 * to subscribe to and the function to be called when the notification comes in.
 * @example useNotification("ALL_MODULES_LOADED", (payload) => console.log("Loaded!"));
 *
 * @example useNotification("*", (event, payload) => console.log("Received event " + event));
 */
export function useNotification(event: "*", subscriber: WildcardHandler): void;
export function useNotification(event: string, subscriber: Handler): void;
export function useNotification(
  event: string,
  subscriber: Handler | WildcardHandler
): void {
  useNotificationImpl(emitter, event, subscriber);
}
/**
 * To emit notifications, use `sendNotification` in a useEffect() block or event handler.
 * Avoid calling it in the component body, because it could be called more than once.
 * @example useEffect(() => fetch(something).then(content => sendNotification("FETCHED", content, 'sender')), [something]);
 */
export const sendNotification = emitter.emit;

export function useSocketNotification(
  sender: string,
  event: "*",
  subscriber: WildcardHandler
): void;
export function useSocketNotification(
  sender: string,
  event: string,
  subscriber: Handler
): void;
export function useSocketNotification(
  sender: string,
  event: string,
  subscriber: Handler | WildcardHandler
): void {
  const socketEmitter = useSocketEmitter(sender);
  useNotificationImpl(socketEmitter, event, subscriber);
}

export function sendSocketNotification(sender: string): Emit {
  const socketEmitter = socketMap.ref(sender)[0];
  // usually enough time for the caller to use the return value,
  // and keeps the ref count from growing out of control. Worst
  // case scenario is the socket is closed.
  setTimeout(() => socketMap.unref(sender), 5000);
  return socketEmitter.emit;
}

/********** Private API ***********/

function useNotificationImpl(
  localEmitter: Emitter,
  event: string,
  subscriber: Handler | WildcardHandler
) {
  if (typeof event !== "string" || typeof subscriber !== "function") {
    throw new Error("must provide event string and subscriber function");
  }
  event = event.toLowerCase(); // case-insensitive events
  const subscriberRef = useRef<Handler | WildcardHandler>(subscriber);
  subscriberRef.current = subscriber;
  const cb = useMemo(() => {
    const current = subscriberRef.current;
    if (event === "*") {
      const handler: WildcardHandler = (e, payload) =>
        (current as WildcardHandler)(e, payload);
      return handler;
    } else {
      const handler: Handler = (payload: any) => (current as Handler)(payload);
      return handler;
    }
  }, [event]);
  useEffect(() => {
    localEmitter.on(event, cb as Handler);
    return () => {
      localEmitter.off(event, cb as Handler);
    };
  }, [cb, event, localEmitter]);
}

interface RefMap<K, V> {
  ref(k: K): V;
  unref(k: K): void;
}
// Allows sharing an item accessed by key k and destroying it when no references to
// it remain
function createRefMap<K, V>(
  create: (k: K) => V,
  destroy?: (v: V, k: K) => void
) {
  let map = new Map<K, { v: V; refcount: number }>();
  return {
    ref(k: K): V {
      let rv = map.get(k);
      if (!rv) {
        rv = { v: create(k), refcount: 0 };
        map.set(k, rv);
      }
      rv.refcount += 1;
      return rv.v;
    },
    unref(k: K): void {
      const rv = map.get(k);
      if (!rv) {
        throw new Error("Can't unref namespace that hasn't been ref'ed.");
      } else {
        rv.refcount -= 1;
        if (rv.refcount === 0) {
          destroy?.(rv.v, k);
          map.delete(k); // allow value to be garbage collected
        }
      }
    },
  };
}
// create a React hook to access the RefMap, synchronously returns shared RefMap value for any key
function createUseRefMap<K, V>(refMap: RefMap<K, V>) {
  return function useRefMap(k: K) {
    let box = useRef<{ k?: K; v?: V }>({});
    if (box.current.k !== k) {
      const next = { k: k, v: refMap.ref(k) };
      box.current.k && refMap.unref(box.current.k);
      box.current = next;
    }
    // ensure unref on unmount
    useEffect(() => () => box.current.k && refMap.unref(box.current.k), []);
    return box.current.v!;
  };
}

// create socket and emitter and wire them together
const socketMap = createRefMap(
  (namespace: string) => {
    if (namespace.startsWith("/")) {
      namespace = namespace.substr(1);
    }
    const socket = io(`${window.location.href}${namespace}`);
    const socketEmitter = mitt() as Emitter;
    socket.on("notification", socketEmitter.emit);
    const emitter: Emitter = {
      emit(event: string, payload: any) {
        socket.emit("notification", event, payload);
      },
      on: socketEmitter.on,
      off: socketEmitter.off,
    };
    const close = () => {
      socket.off("notification", socketEmitter.emit);
      socket.close();
    };
    return [emitter, close] as const;
  },
  ([_, close]) => close()
);
const useSocketMap = createUseRefMap(socketMap);

// Creates an Emitter instance ({ on, off, emit }) that sends and receives
// events over a socket connection
function useSocketEmitter(namespace: string = "/") {
  if (!namespace.startsWith("/")) {
    namespace = "/" + namespace;
  }
  // share one socket emitter for each namespace
  const [emitter] = useSocketMap(namespace);
  return emitter;
}

export const internal_notificationSocketRefMap = socketMap;

type Emit = (event: string, payload: any) => void;
type Emitter = {
  on(event: "*", handler: WildcardHandler): void;
  on(event: string, handler: Handler): void;
  off(event: "*", handler: WildcardHandler): void;
  off(event: string, handler: Handler): void;
  emit: Emit;
};
type Handler = (payload: any) => void;
type WildcardHandler = (event: string, payload: any) => void;
