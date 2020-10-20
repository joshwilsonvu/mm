/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react-hooks";
import waitFor from "wait-for-expect";
import Server from "socket.io";
import {
  useNotification,
  sendNotification,
  useSocketNotification,
  sendSocketNotification,
  SOCKET_PORT,
} from "./notification";
import { serverSocketEmitter } from "../node-helper";

test("works", () => {
  let subscriberFn = jest.fn();
  renderHook(() => useNotification("event", subscriberFn));
  // use sendNotification to send out an 'event' notification
  act(() => {
    sendNotification("event", "payload");
  });

  expect(subscriberFn).toHaveBeenCalledTimes(1);
  expect(subscriberFn).toHaveBeenCalledWith("payload");
});

test('passes type to "*" subscribers"', () => {
  let subscriberFn = jest.fn();
  renderHook(() => useNotification("*", subscriberFn));
  act(() => {
    sendNotification("event", "payload");
  });

  expect(subscriberFn).toHaveBeenCalledTimes(1);
  expect(subscriberFn).toHaveBeenCalledWith("event", "payload");
});

test("client <--> server", async () => {
  jest.setTimeout(10 * 1000);
  const port = 8081;
  mockWindowLocation(port);

  let io;
  try {
    // Server-side
    io = new Server(SOCKET_PORT);
    const onConnect = jest.fn(),
      onDisconnect = jest.fn();
    const { on, off, emit } = serverSocketEmitter(io, "sender", {
      onConnect,
      onDisconnect,
    });

    const serverHandler = jest.fn(),
      serverHandlerStar = jest.fn();
    on("event", serverHandler);
    on("*", serverHandlerStar);

    // Client-side
    // send an "event" notification from "sender"
    sendSocketNotification("sender", "event", "payload");
    await waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1), 4000);
    expect(onDisconnect).toHaveBeenCalledTimes(0);
    await waitFor(() => expect(serverHandler).toHaveBeenCalledTimes(1), 500);

    // Server-side
    expect(serverHandler).toHaveBeenCalledTimes(1);
    expect(serverHandler).toHaveBeenCalledWith("payload");
    expect(serverHandlerStar).toHaveBeenCalledTimes(1);
    expect(serverHandlerStar).toHaveBeenCalledWith("event", "payload");

    off("event", serverHandler);
    off("*", serverHandlerStar);

    // Client-side
    const subscriber = jest.fn();
    const subscriberStar = jest.fn();
    const wrongEvent = jest.fn();
    const wrongNamespace = jest.fn();
    for (const args of [
      ["sender", "event", subscriber],
      ["sender", "*", subscriberStar],
      ["sender", "wrongEvent", wrongEvent],
      ["wrongNamespace", "event", wrongNamespace],
    ]) {
      renderHook(() => useSocketNotification(...args));
    }

    // Server-side: emit event
    emit("event", "payload");

    // Client side
    await waitFor(() => expect(subscriber).toHaveBeenCalledTimes(1), 500);
    expect(subscriber).toHaveBeenCalledWith("payload");
    expect(subscriberStar).toHaveBeenCalledTimes(1);
    expect(subscriberStar).toHaveBeenCalledWith("event", "payload");
    expect(wrongEvent).toHaveBeenCalledTimes(0);
    expect(wrongNamespace).toHaveBeenCalledTimes(0);
  } finally {
    io && io.close();
  }
});

function mockWindowLocation(port) {
  jest
    .spyOn(window, "location", "get")
    .mockImplementation(() => new URL(`http://127.0.0.1:${port}/`));
}
