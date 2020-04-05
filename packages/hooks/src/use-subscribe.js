import React, { createContext, useEffect, useContext, useRef } from 'react';
import useConstant from 'use-constant';

const Context = createContext({});

// Creates Provider, useSubscribe, and usePublish that use the given context.
function createEmitter() {
  let events = {};
  return {
    // type defaults to '*', a catch-all event; handler will receive type as first arg if type is '*'
    on(type, handler) {
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
      if (type !== '*') {
        (events[type] || []).forEach(handler => handler(payload, sender));
      }
      (events['*'] || []).forEach(handler => handler(type, payload, sender));
    }
  };
}

function Provider(props) {
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
  if (typeof event === "function") {
    subscriber = event;
    event = "*";
  }
  const emitter = useEmitter();
  const subscriberRef = useRef(null);
  subscriberRef.current = subscriber;
  useEffect(() => {
    function cb(...args) {
      subscriberRef.current && subscriberRef.current(...args);
    }
    emitter.on(event, cb);
    return () => emitter.off(event, cb);
  }, [event, emitter]);
}

/*
  * To emit, use the return value of this hook in a useEffect() block or event handler.
  * It's not a good idea to call it in the render phase as it could be called more than once.
  *     const sendNotification = useSendNotification();
  *     useEffect(() => fetch(something).then(content => sendNotification("FETCHED", content, 'sender')), [something]);
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

