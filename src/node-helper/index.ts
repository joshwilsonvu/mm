import path from "path";
import express from "express";
import SocketIO from "socket.io";
import * as mitt from "mitt";
import fs from "fs";

export default class NodeHelper {
  /**
   * The name of the module.
   */
  name: string;
  /**
   * The path to the directory containing the module.
   */
  path: string;
  /**
   * An express Router that can define HTTP routes.
   * @alias expressApp
   */
  router: express.Router;
  get expressApp() {
    return this.router;
  }
  set expressApp(val: express.Router) {
    this.router = val;
  }
  /**
   * This is a link to the IO instance. It will allow you to do some Socket.IO magic. In most cases you won't need this,
   * since the Node Helper has a few convenience methods to make this simple.
   */
  io?: SocketIO.Server;

  // See @mm/cli/lib/shared/create-server
  constructor(io: SocketIO.Server, helperPath: string) {
    this.path = path.dirname(helperPath);
    this.name = path.basename(this.path);
    this.router = express.Router();
    const publicPath = path.join(this.path, "public");
    if (fs.existsSync(publicPath)) {
      this.router.use("/" + this.name, express.static(publicPath));
    }
    this.io = io;

    this.emitter = serverSocketEmitter(io, this.name, {
      onConnect: () => console.debug("io connected for", this.name),
      onDisconnect: () => console.debug("io disconnected for", this.name),
    });
    if (this.socketNotificationReceived) {
      this.emitter.on("*", this.socketNotificationReceived.bind(this));
    }

    this.init();
  }

  init() {
    console.debug("Initializing new module helper for", this.name);
  }

  /**
   * @deprecated
   */
  loaded() {}

  start() {
    console.log("Starting module helper for", this.name);
  }

  /**
   * Called when the MagicMirror server receives a `SIGINT`
   * Close any open connections, stop any sub-processes and
   * gracefully exit the module.
   *
   */
  stop() {
    console.log("Stopping module helper for", this.name);
  }

  /**
   * This method is called when a socket notification arrives.
   *
   * argument notification string - The identifier of the notification.
   * argument payload mixed - The payload of the notification.
   */
  socketNotificationReceived(notification?: string, payload?: any) {}

  emitter: mitt.Emitter;

  /**
   * Send a socket notification to the module.
   *
   * argument notification string - The identifier of the notificatiopn.
   * argument payload mixed - The payload of the notification.
   */
  get sendSocketNotification() {
    return this.emitter.emit;
  }

  /**
   * `NodeHelper.create({ ...methods })` is just an alternative to
   *    `class MyNodeHelper extends NodeHelper {
   *       ...methods
   *     }`
   * and using the ES6 class syntax is recommended.
   */
  static create(moduleDefinition: Partial<NodeHelper> & Record<string, any>) {
    class Subclass extends NodeHelper {}
    assignProperties(Subclass.prototype, moduleDefinition);
    return Subclass as typeof NodeHelper;
  }
}

export function serverSocketEmitter(
  io: SocketIO.Server,
  namespace: string = "/",
  { onConnect, onDisconnect }: Options = {}
): mitt.Emitter {
  if (!namespace.startsWith("/")) {
    namespace = "/" + namespace;
  }
  const emitter = mitt.default();
  io.of(namespace).on("connection", (socket) => {
    onConnect?.(socket);
    // this uses plain 'notification' instead of custom events, and then passes the `event`
    // argument to Emitter#emit(). This is so we can use special "*" events to represent
    // any event, without mucking with Socket.io's internals.
    socket.on("notification", (event: string, payload: any) => {
      if (event !== "*") {
        emitter.emit(event, payload); // calls any emitter.on() handlers
      }
    });
    socket.on("disconnect", () => {
      onDisconnect?.(socket);
    });
  });
  return {
    ...emitter,
    emit(event: string, payload: any) {
      if (event !== "*") {
        io.of(namespace).emit("notification", event, payload);
      }
    },
  };
}

interface Options {
  onConnect?: (socket: SocketIO.Socket) => void;
  onDisconnect?: (socket: SocketIO.Socket) => void;
}

// Like Object.assign but includes getters, setters, and other property descriptors
function assignProperties(target: object, source: any) {
  for (const k in source) {
    if (source.hasOwnProperty(k)) {
      Object.defineProperty(
        target,
        k,
        Object.getOwnPropertyDescriptor(source, k)!
      );
    }
  }
}
