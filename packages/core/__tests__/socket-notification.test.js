/**
 * @jest-environment jsdom
 */

import waitFor from "wait-for-expect";
import { renderHook } from "@testing-library/react-hooks";
import Server from "socket.io";

function mockWindowLocation(port) {
  jest
    .spyOn(window, "location", "get")
    .mockImplementation(() => new URL(`http://127.0.0.1:${port}/`));
}

// Require a different instance of the source, so tests don't share the same state
function requireCore() {
  let core;
  jest.isolateModules(() => core = require("../src"));
  return core;
}

test("client to server", async () => {
  jest.setTimeout(10 * 1000);
  const port = 8081;
  mockWindowLocation(port);

  //
  const {
    sendSocketNotification,
    serverSocketEmitter,
  } = requireCore();

  let io;
  try {
    // Server-side
    io = new Server(port);
    const onConnect = jest.fn(),
      onDisconnect = jest.fn();
    const { on, off } = serverSocketEmitter(io, "sender", {
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
    await waitFor(() => expect(serverHandler).toHaveBeenCalledTimes(1), 1000);

    off("event", serverHandler);
    off("*", serverHandlerStar);

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledTimes(0);
    expect(serverHandler).toHaveBeenCalledTimes(1);
    expect(serverHandler).toHaveBeenCalledWith("payload");
    expect(serverHandlerStar).toHaveBeenCalledTimes(1);
    expect(serverHandlerStar).toHaveBeenCalledWith("event", "payload");
  } finally {
    io && io.close();
  }
});

test("server to client", async () => {
  jest.setTimeout(10 * 1000);
  const port = 8082;
  mockWindowLocation(port);

  const {
    useSocketNotification,
    serverSocketEmitter,
  } = requireCore();

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
    for (const args of [
      ["sender", "event", subscriber],
      ["sender", "*", subscriberStar],
      ["sender", "wrongEvent", wrongEvent],
      ["wrongNamespace", "event", wrongNamespace],
    ]) {
      renderHook(() => useSocketNotification(...args));
    }

    await waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1), 4000);
    // Emit event from server
    emit("event", "payload");

    await waitFor(() => expect(subscriber).toHaveBeenCalledTimes(1), 4000);
    expect(subscriber).toHaveBeenCalledWith("payload");
    expect(subscriberStar).toHaveBeenCalledTimes(1);
    expect(subscriberStar).toHaveBeenCalledWith("event", "payload");
    expect(wrongEvent).toHaveBeenCalledTimes(0);
    expect(wrongNamespace).toHaveBeenCalledTimes(0);
  } finally {
    io && io.close();
  }
});
