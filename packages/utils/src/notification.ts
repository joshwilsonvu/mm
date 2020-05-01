import * as React from 'react';
import useConstant from 'use-constant';
import mitt from 'mitt';

const Context = React.createContext({});

function NotificationProvider({ children }: React.PropsWithChildren<{}>) {
  const emitter = useConstant(mitt);
  return React.createElement(Context.Provider,  { value: emitter }, children);
}

function useEmitter() { return React.useContext(Context) as mitt.Emitter; }

/*
  * To subscribe to a notification, call this hook with the name of the notification
  * to subscribe to and the function to be called when the notification comes in.
  *     useSubscribe("ALL_MODULES_LOADED", (payload, sender) => console.log("Loaded!"));
  *
  * Listen to all events with
  *     useSubscribe("*", (event, payload, sender) => console.log("Received event " + event));
  */
type Func = (...args: any[]) => void;
function useNotification(subscriber: Func): void;
function useNotification(event: string, subscriber: Func): void;
function useNotification(event: string | Func, subscriber?: (...args: any[]) => void) {
  if (typeof event === "function") {
    subscriber = event;
    event = "*";
  }
  event = event.toLocaleLowerCase();
  const emitter = useEmitter();
  const subscriberRef = React.useRef<Func | null>(null);
  subscriberRef.current = subscriber!;
  React.useEffect(() => {
    function cb(...args: any[]) {
      subscriberRef.current && subscriberRef.current(...args);
    }
    emitter.on(event as string, cb);
    return () => emitter.off(event as string, cb);
  }, [event, emitter]);
}

/*
  * To emit, use the return value of this hook in a useEffect() block or event handler.
  * Try not to call it in the render phase as it could be called more than once.
  *     const sendNotification = useSendNotification();
  *     useEffect(() => fetch(something).then(content => sendNotification("FETCHED", content, 'sender')), [something]);
  */
function useSendNotification() {
  const { emit } = useEmitter();
  return emit;
}

export {
  NotificationProvider as Provider,
  useNotification,
  useSendNotification,
};




