import React, { createContext, useEffect, useContext, useCallback, useRef } from 'react';
import useConstant from 'use-constant';



const Context = createContext({});
const defaultKey = Symbol("default");
const destinationKey = Symbol("destination");

// Creates Provider, useSubscribe, and usePublish that use the given context.
function createEmitter() {
  let events = {};
  return {
    // type defaults to '*', a catch-all event; handler will receive type as first arg if handler.length === 3
    on(type = '*', handler) {
      if (typeof type === "function") {
        handler = type;
        type = '*';
      }
      (events[type] || (events[type] = [])).push(handler)
    },
    off(type, handler) {
      if (events[type]) {
        events[type].splice(events[type].indexOf(handler) >>> 0, 1);
      }
    },
    emit(type, payload, sender) {
      for (let handler of [...events[type], ...events['*']]) {
        // provide type if handler takes three args, typically done with '*' events
        if (handler.length === 3) {
          handler(type, payload, sender);
        } else {
          handler(payload, sender);
        }
      }
    }
  };
}

function Provider(props) {
  const events = useRef({});
  const emitter = useConstant(createEmitter);
  return <Context.Provider {...props} value={emitter} />;
}

function useEmitter() { return useContext(Context); }

/*
  * To subscribe to a notification, call this hook with the name of the notification
  * to subscribe to and the function to be called when the notification comes in.
  *     useSubscribe("ALL_MODULES_LOADED", (payload, sender) => console.log("Loaded!"));
  *
  * Listen to all events with
  *     useSubscribe("*", (event, payload, sender) => console.log("Received event " + event));
  */
function useNotification(event, subscriber) {
  const emitter = useEmitter();
  const subscriberRef = useRef(null);
  subscriberRef.current = subscriber;
  useEffect(() => {
    function cb(...args) {
      subscriberRef.current && subscriberRef.current(...args);
    }
    // Provide the correct 'length' property for inspection
    Object.defineProperty(cb, 'length', {
      configurable: true,
      get: () => subscriberRef.current && subscriberRef.current.length || 0
    })
    emitter.on(event, cb);
    return () => emitter.off(event, cb);
  }, [event, emitter]);
}

/*
  * To emit, use the return value of this hook in a useEffect() block or event handler.
  * It's not a good idea to call it in the render phase as it could be called more than once.
  *     const sendNotification = useSendNotification();
  *     useEffect(() => fetch(something).then(content => sendNotification("FETCHED", content)), [something]);
  */
function useSendNotification() {
  const { emit } = useEmitter();
  return emit;
}

export {
  Provider,
  useNotification,
  useSendNotification,
};

