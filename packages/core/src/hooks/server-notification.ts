import type SocketIO from "socket.io";

interface Options {
  onConnect?: (socket: SocketIO.Socket) => void;
  onDisconnect?: (socket: SocketIO.Socket) => void;
}

export function serverSocketEmitter(
  io: SocketIO.Server,
  namespace: string = "/",
  { onConnect, onDisconnect }: Options = {}
) {
  const Emitter = require("mitt");
  if (!namespace.startsWith("/")) {
    namespace = "/" + namespace;
  }
  const emitter = Emitter();
  io.of(namespace).on("connection", (socket) => {
    onConnect?.(socket);
    // this uses plain 'message' instead of custom events, and then passes the `event`
    // argument to Emitter#emit(). This is so we can use special "*" events to represent
    // any event, without mucking with Socket.io's internals.
    socket.on("message", (event: string, payload: any) => {
      if (event !== "*") {
        emitter.emit(event, payload); // calls any emitter.on() handlers
      }
    });
    socket.on("disconnect", () => {
      onDisconnect?.(socket);
    });
  });
  return {
    emit(event: string, payload: any) {
      if (event !== "*") {
        io.of(namespace).send(event, payload);
      }
    },
    on: emitter.on,
    off: emitter.off,
  };
}
