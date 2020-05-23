import * as React from 'react';
import useConstant from 'use-constant';
import Emitter from 'mitt';
import io from 'socket.io-client';

export {
  NotificationProvider,
  useNotification,
  useSocketNotification,
};

/**
 * Include this component in the tree to use `useNotification` and `useSendNotification`.
 */
function NotificationProvider({ children }: React.PropsWithChildren<{}>) {
  const emitter = useConstant(Emitter);
  return React.createElement(Context.Provider,  { value: emitter }, children);
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
function useNotification(event: "*", subscriber: mitt.WildcardHandler): void;
function useNotification(event: string, subscriber: mitt.Handler): void;
function useNotification(event: string, subscriber: mitt.Handler | mitt.WildcardHandler) {
  const emitter = useContextEmitter();
  useNotificationImpl(emitter, event, subscriber);
  return emitter.emit;
}

function useSocketNotification(sender: string, event: string, subscriber: mitt.Handler): void;
function useSocketNotification(sender: string, event: "*", subscriber: mitt.WildcardHandler): void
function useSocketNotification(sender: string, event: string, subscriber: mitt.Handler | mitt.WildcardHandler) {
  const emitter = useSocketEmitter(sender);
  useNotificationImpl(emitter, event, subscriber);
  return emitter.emit;
}

/********** Private API ***********/

const Context = React.createContext({});
function useContextEmitter() { return React.useContext(Context) as mitt.Emitter; }

function useNotificationImpl(emitter: mitt.Emitter, event: string, subscriber: mitt.Handler | mitt.WildcardHandler) {
  event = event.toLocaleLowerCase();
  const subscriberRef = React.useRef<mitt.Handler | mitt.WildcardHandler | null>(null);
  subscriberRef.current = subscriber || null;
  React.useEffect(() => {
    function cb(...args: Parameters<mitt.Handler | mitt.WildcardHandler>) {
      subscriberRef.current?.(...args);
    }
    emitter.on(event, cb);
    return () => emitter.off(event, cb);
  }, [event, emitter]);
}

interface RefMap<K, V> {
  ref(k: K): V,
  unref(k: K): void,
}
// Allows sharing an item accessed by key k and destroying it when no references to
// it remain
function createRefMap<K, V>(create: (k: K) => V, destroy?: (v: V, k?: K) => void) {
  let map = new Map<K, { v: V, refcount: number }>();
  return {
    ref(k: K): V {
      let rv = map.get(k);
      if (!rv) {
        rv = { v: create(k), refcount: 0 }
        map.set(k, rv);
      }
      rv.refcount += 1;
      return rv.v;
    },
    unref(k: K): void {
      let rv = map.get(k);
      if (!rv) {
        throw new Error("Can't unref namespace that hasn't been ref'ed.");
      } else {
        rv.refcount -= 1;
        if (rv.refcount === 0) {
          destroy?.(rv.v, k)
          map.delete(k); // allow value to be garbage collected
        }
      }
    }
  }
}
// create a React hook to access the RefMap, synchronously returns shared RefMap value for any key
function createUseRefMap<K, V>(refMap: RefMap<K, V>) {
  return function useRefMap(k: K) {
    let box = React.useRef<{ k?: K, v?: V }>({});
    if (box.current.k !== k) {
      box.current.k && refMap.unref(box.current.k);
      box.current = { k: k, v: refMap.ref(k) };
    }
    // ensure unref on unmount
    React.useEffect(() => () => box.current.k && refMap.unref(box.current.k), []);
    return box.current.v!;
  }
}

const socketMap = createRefMap(
  (namespace: string) => ({ socket: io(namespace), emitter: Emitter() }),
  ({socket}: { socket: SocketIOClient.Socket }) => socket.close()
);
const useSocketMap = createUseRefMap(socketMap);

// Creates an Emitter instance ({ on, off, emit }) that sends and receives
// events over a socket connection
function useSocketEmitter(namespace: string = "/") {
  // share one socket and emitter for each namespace
  const { socket, emitter } = useSocketMap(namespace);
  React.useEffect(() => {
    socket.on("message", emitter.emit);
    return () => {
      socket.off("message", emitter.emit);
    }
  }, [socket, emitter.emit]);
  return React.useMemo(() => ({
    emit(event: string, payload: any) {
      socket?.send(event, payload);
    },
    on: emitter.on,
    off: emitter.off,
  }), [emitter.on, emitter.off, socket]);
};

