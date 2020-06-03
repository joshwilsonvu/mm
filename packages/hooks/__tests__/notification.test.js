/**
 * @jest-environment jsdom
 */

import { waitFor } from "@testing-library/dom";
import { renderHook, act } from "@testing-library/react-hooks";
import { NotificationProvider, useNotification, useSocketNotification } from '../src';
import { serverSocketEmitter } from '../src/server-notification'; // not directly accessible from '..'
import Server from "socket.io";

describe('useNotification', () => {
  function setup(event) {
    let subscriberFn = jest.fn();
    return {
      ...(renderHook(() => {
        // set up useNotification to listen for the notification
        return event ? useNotification(event, subscriberFn) : useNotification();
      }, { wrapper: NotificationProvider })),
      subscriberFn
    };
  }

  test('works', () => {
    const { result, subscriberFn } = setup('event');
    // ...and use sendNotification to send out an 'event' notification
    act(() => {
      let sendNotification = result.current;
      sendNotification('event', 'payload');
    });

    expect(subscriberFn).toHaveBeenCalledTimes(1);
    expect(subscriberFn).toHaveBeenCalledWith('payload');
  });

  test('passes type to "*" subscribers"', () => {
    const { result, subscriberFn } = setup("*");
    act(() => {
      let sendNotification = result.current;
      sendNotification('event', 'payload');
    });

    expect(subscriberFn).toHaveBeenCalledTimes(1);
    expect(subscriberFn).toHaveBeenCalledWith('event', 'payload');
  });

  test('returns emitter even if called with no arguments', () => {
    const { result } = setup();
    expect(typeof result.current).toBe('function');
  });
});

describe('useSocketNotification', () => {
  function mockWindowLocation(port) {
    jest.spyOn(window, "location", "get").mockImplementation(() => new URL(`http://localhost:${port}/`));
    expect(window.location.toString()).toBe(`http://localhost:${port}/`);
  }

  test("client to server", async () => {
    jest.setTimeout(10 * 1000);
    const port = 8081;
    mockWindowLocation(port);

    let io;
    try {
      // Server-side
      io = new Server(port);
      const onConnect = jest.fn(), onDisconnect = jest.fn();
      const { on, off } = serverSocketEmitter(io, "sender", { onConnect, onDisconnect });
      const serverHandler = jest.fn(), serverHandlerStar = jest.fn();

      on("event", serverHandler);
      on("*", serverHandlerStar);

      // Client-side
      const { result, unmount } = renderHook(() => {
        return useSocketNotification("sender")
      });

      await waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1), { timeout: 4000 });

      act(() => {
        const sendSocketNotification = result.current;
        sendSocketNotification("event", "payload"); // send an "event" notification
      });

      await waitFor(() => expect(serverHandler).toHaveBeenCalledTimes(1), { timeout: 1000 });

      off("event", serverHandler);
      off("*", serverHandlerStar);

      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onDisconnect).toHaveBeenCalledTimes(0);
      expect(serverHandler).toHaveBeenCalledTimes(1);
      expect(serverHandler).toHaveBeenCalledWith("payload");
      expect(serverHandlerStar).toHaveBeenCalledTimes(1);
      expect(serverHandlerStar).toHaveBeenCalledWith("event", "payload");

      unmount();

      await waitFor(() => expect(onDisconnect).toHaveBeenCalledTimes(1), { timeout: 1000 });

    } finally {
      io && io.close();
    }
  });

  test("server to client", async () => {
    jest.setTimeout(10 * 1000);
    const port = 8082;
    mockWindowLocation(port);

    let io;
    try {
      // Server-side
      io = new Server(port);
      const onConnect = jest.fn();
      const { emit } = serverSocketEmitter(io, "sender", { onConnect });

      // Client-side
      const subscriber = jest.fn();
      const subscriberStar = jest.fn();
      const wrongEvent = jest.fn();
      const wrongNamespace = jest.fn();
      renderHook(() => {
        useSocketNotification("sender", "event", subscriber);
        useSocketNotification("sender", "*", subscriberStar);
        useSocketNotification("sender", "wrongEvent", wrongEvent);
        useSocketNotification("wrongNamespace", "event", wrongNamespace);
      })

      // Emit event from server
      await waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1), { timeout: 4000 });
      emit("event", "payload");

      await waitFor(() => expect(subscriber).toHaveBeenCalledTimes(1), { timeout: 1000 });
      expect(subscriber).toHaveBeenCalledWith("payload");
      expect(subscriberStar).toHaveBeenCalledTimes(1);
      expect(subscriberStar).toHaveBeenCalledWith("event", "payload");
      expect(wrongEvent).toHaveBeenCalledTimes(0);
      expect(wrongNamespace).toHaveBeenCalledTimes(0);
    } finally {
      io && io.close();
    }
  });
});
