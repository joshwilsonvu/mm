import * as React from "react";
import useConstant from "use-constant";
import mitt from "mitt";
import io from "socket.io-client";

/**
 * Include this component in the tree to use `useNotification` and `useSendNotification`.
 */
export function NotificationProvider({
  children,
}: React.PropsWithChildren<{}>) {
  const emitter = useConstant(mitt) as Emitter;
  return React.createElement(Context.Provider, { value: emitter }, children);
}

/**
 * To subscribe to a notification, call this hook with the name of the notification
 * to subscribe to and the function to be called when the notification comes in.
 *     useSubscribe("ALL_MODULES_LOADED", (payload, sender) => console.log("Loaded!"));
 *
 * Listen to all events with
 *     useSubscribe("*", (event, payload, sender) => console.log("Received event " + event));
 *
 * To emit, use the return value of this hook in a useEffect() block or event handler.
 * Try not to call it in the render phase as it could be called more than once.
 *     const sendNotification = useSendNotification();
 *     useEffect(() => fetch(something).then(content => sendNotification("FETCHED", content, 'sender')), [something]);
 */
export function useNotification(): Emit;
export function useNotification(event: "*", subscriber: WildcardHandler): Emit;
export function useNotification(event: string, subscriber: Handler): Emit;
export function useNotification(
  event?: string,
  subscriber?: Handler | WildcardHandler
): Emit {
  const emitter = useContextEmitter();
  useNotificationImpl(emitter, event, subscriber);
  return emitter.emit;
}

export function useSocketNotification(sender: string): Emit;
export function useSocketNotification(
  sender: string,
  event: string,
  subscriber: Handler
): Emit;
export function useSocketNotification(
  sender: string,
  event: "*",
  subscriber: WildcardHandler
): Emit;
export function useSocketNotification(
  sender: string,
  event?: string,
  subscriber?: Handler | WildcardHandler
) {
  const emitter = useSocketEmitter(sender);
  useNotificationImpl(emitter, event, subscriber);
  return emitter.emit;
}

/********** Private API ***********/

const Context = React.createContext({});
function useContextEmitter() {
  return React.useContext(Context) as Emitter;
}

function useNotificationImpl(
  emitter: Emitter,
  event?: string,
  subscriber?: Handler | WildcardHandler
) {
  if (event === undefined || subscriber === undefined) {
    event = undefined;
    subscriber = undefined;
  }
  const subscriberRef = React.useRef<Handler | WildcardHandler | undefined>();
  subscriberRef.current = subscriber;
  React.useEffect(() => {
    function cb(event: any, payload?: any) {
      const current = subscriberRef.current;
      if (current) {
        if (payload) {
          (current as WildcardHandler)(event, payload);
        } else {
          (current as Handler)(event); // event is actually the payload
        }
      }
    }
    if (event) {
      const e = event.toLowerCase();
      emitter.on(e, cb);
      return () => {
        emitter.off(e, cb);
      };
    }
  }, [event, emitter]);
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
    let box = React.useRef<{ k?: K; v?: V }>({});
    if (box.current.k !== k) {
      const next = { k: k, v: refMap.ref(k) };
      box.current.k && refMap.unref(box.current.k);
      box.current = next;
    }
    // ensure unref on unmount
    React.useEffect(
      () => () => box.current.k && refMap.unref(box.current.k),
      []
    );
    return box.current.v!;
  };
}

// create socket and emitter and wire them together
const socketMap = createRefMap(
  (namespace: string) => {
    if (namespace.startsWith("/")) {
      namespace = namespace.substr(1);
    }
    const socket = io(`${window.location.href}${namespace}`, {
      transports: ["websocket"],
    });
    const emitter = mitt() as Emitter;
    socket.on("message", emitter.emit);
    return { socket, emitter };
  },
  ({ socket, emitter }) => {
    socket.off("message", emitter.emit);
    socket.close();
  }
);
const useSocketMap = createUseRefMap(socketMap);

// Creates an Emitter instance ({ on, off, emit }) that sends and receives
// events over a socket connection
function useSocketEmitter(namespace: string = "/") {
  if (!namespace.startsWith("/")) {
    namespace = "/" + namespace;
  }
  // share one socket and emitter for each namespace
  const { socket, emitter } = useSocketMap(namespace);
  return React.useMemo(
    () => ({
      emit(event: string, payload: any) {
        socket?.send(event, payload);
      },
      on: emitter.on,
      off: emitter.off,
    }),
    [emitter, socket?.send]
  );
}

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
