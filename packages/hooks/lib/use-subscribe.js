import React, { createContext, useEffect, useContext, useCallback, useRef } from 'react';
import useConstant from 'use-constant';
import mitt from 'mitt';

const PubSubContext = createContext(null);
const defaultKey = Symbol("default");
const destinationKey = Symbol("destination");

// Creates Provider, useSubscribe, and usePublish that use the given context. Useful for separate "rooms".
export const createPubSub = Context => {
  function Provider(props) {
    const emitter = useConstant(mitt);
    return <Context.Provider {...props} value={emitter} />;
  }

  function useEmitter() { return useContext(Context); }

  /*
   * To subscribe to a notification, call this hook with the name of the notification
   * to subscribe to and the function to be called when the notification comes in.
   *     useSubscribe("ALL_MODULES_LOADED", payload => console.log("Loaded!"));
   *
   * Listen to all events with
   *     useSubscribe("*", (payload, event) => console.log("Received event " + event));
   *
   * If an optional third argument is supplied with a unique identifier, events from
   * usePublish(_, _, destination) will only reach subscribers with a matching identifier.
   *     useSubscribe("UPDATE", payload => console.log("Updated!"), "foo");
   *     ...
   *     const publish = usePublish();
   *     publish("UPDATE", {}, "foo");
   */
  function useSubscribe(event, subscriber, identity) {
    const emitter = useEmitter();
    const subscriberRef = useRef(null);
    subscriberRef.current = subscriber;
    useEffect(() => {
      function cb(type, payload) {
        // change argument order to keep payload first when the event is a catch-all
        if (typeof payload === "undefined") {
          payload = type;
          type = undefined;
        }
        // when the payload contains a destination, only call the subscriber if identity matches
        if (!identity || !payload[destinationKey] || payload[destinationKey] === identity) {
          // extract the payload from the object if it was wrapped
          if (payload[defaultKey]) {
            payload = payload[defaultKey];
          }
          subscriberRef.current && subscriberRef.current(payload, type);
        }
      }

      emitter.on(event, cb);
      return () => emitter.off(event, cb);
    }, [event, identity, emitter]);
  }

  /*
   * To emit, use the return value of this hook in a useEffect() block or event handler.
   * It's not a good idea to call it in the render phase as it could be called more than once.
   *     const publish = usePublish();
   *     useEffect(() => fetch(something).then(content => publish("FETCHED", content)), [something]);
   * To publish to a specific listener,
   *     publish("FETCHED", payload, destination) // "foo"
   */
  function usePublish() {
    const emitter = useEmitter();
    // return value of hook acts as emit function
    return useCallback(
      (event, payload, destination) => {
        // wrap payload in an object if it's not already an object
        if (typeof payload !== "object") {
          payload = { [defaultKey]: payload };
        }
        emitter.emit(event, {
          ...payload,
          ...(destination && { [destinationKey]: destination })
        })
      },
      [emitter]
    );
  }

  return {
    Provider,
    useSubscribe,
    usePublish,
  };
};

const { Provider, useSubscribe, usePublish } = createPubSub(PubSubContext);
export {
  Provider,
  useSubscribe,
  usePublish
}
