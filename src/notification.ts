import { useEffect, useRef, useMemo } from "react";
import mitt from "mitt";
import io from "socket.io-client";

const emitter = mitt() as Emitter;

/**
 * To subscribe to a notification, use this hook with the name of the notification
 * to subscribe to and the function to be called when the notification comes in.
 * @example useNotification("ALL_MODULES_LOADED", (payload) => console.log("Loaded!"));
 *
 * @example useNotification("*", (notification, payload) => console.log("Received notification " + notification));
 */
export function useNotification(
  notification: "*",
  subscriber: WildcardHandler
): void;
export function useNotification(
  notification: string,
  subscriber: Handler
): void;
export function useNotification(
  notification: string,
  subscriber: Handler | WildcardHandler
): void {
  useNotificationImpl(emitter, notification, subscriber);
}

/**
 * To send notifications, use `sendNotification` in a useEffect() block or event handler.
 * Avoid calling it in the component body, because it could be called more than once.
 * @example useEffect(() => fetch(something).then(content => sendNotification("FETCHED", content), [something]);
 */
export const sendNotification = emitter.emit;

/**
 * To subscribe to notifications from the node helper, use this hook with the name of the
 * module, the name of the notification to subscribe to, and the function to be called
 * when the notification comes in.
 * @example useSocketNotification(name, "NEW_CONTENT", (payload) => setContent(payload));
 * @param sender pass the `name` prop of the component
 * @param notification the notification name to receive from the helper
 * @param subscriber data received from the helper
 */
export function useSocketNotification(
  sender: string,
  notification: "*",
  subscriber: WildcardHandler
): void;
export function useSocketNotification(
  sender: string,
  notification: string,
  subscriber: Handler
): void;
export function useSocketNotification(
  sender: string,
  notification: string,
  subscriber: Handler | WildcardHandler
): void {
  const socketEmitter = socketCache.get(sender);
  useNotificationImpl(socketEmitter, notification, subscriber);
}

/**
 * To send a notification to the node helper, use `sendSocketNotification` in a useEffect() block or event handler.
 * Avoid calling it in the component body, because it could be called more than once.
 * @example useEffect(() => fetch(something).then(content => sendSocketNotification(name, "FETCHED", content), [something]);
 * @param sender pass the `name` prop of the component
 * @param notification the notification name to send to the helper
 * @param payload any data to send to the helper
 */
export function sendSocketNotification(
  sender: string,
  notification: string,
  payload: any
): void {
  const socketEmitter = socketCache.get(sender);
  socketEmitter.emit(notification, payload);
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

interface Cache<K, V> {
  get(k: K): V;
}
// Allows sharing an item accessed by key k
function createCache<K, V>(create: (k: K) => V): Cache<K, V> {
  let map = new Map<K, V>();
  return {
    get(k: K): V {
      let val = map.get(k);
      if (!val) {
        val = create(k);
        map.set(k, val);
      }
      return val;
    },
  };
}

// Connect to Socket.io on another port, so Snowpack can use the configured port for hot updates
export const SOCKET_PORT = 18381;

// Creates a cache of Emitter instances ({ on, off, emit }) that send and receive
// events over socket connections
const socketCache = createCache((namespace: string) => {
  if (namespace.startsWith("/")) {
    namespace = namespace.substr(1);
  }
  const loc = window.location;
  const socketUrl = `${loc.protocol}//${loc.hostname}:${SOCKET_PORT}/${namespace}`;
  const socket = io(socketUrl);
  const socketEmitter = mitt() as Emitter;

  socket.on("notification", socketEmitter.emit);
  const emitter: Emitter & { close?(): void } = {
    emit(event: string, payload: any) {
      socket.emit("notification", event, payload);
    },
    on: socketEmitter.on,
    off: socketEmitter.off,
  };
  return emitter;
});

type Emit = (event: string, payload: any) => void;
export type Emitter = {
  on(event: "*", handler: WildcardHandler): void;
  on(event: string, handler: Handler): void;
  off(event: "*", handler: WildcardHandler): void;
  off(event: string, handler: Handler): void;
  emit: Emit;
};
type Handler = (payload: any) => void;
type WildcardHandler = (event: string, payload: any) => void;
