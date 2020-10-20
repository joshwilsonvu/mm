/*
 * This file defines a new way to write node helpers for MagicMirror.
 * It takes the familiar ideas of serving files and sending and
 * receiving socket notifications, and provides a cleaner way to do it.
 * See the example below:
 *
 * import NodeHelper from "magicmirror/node-helper"
 *
 * const helper = new NodeHelper(__dirname);
 *
 * // `onSocketNotification` runs a function whenever an "add" socket notification is received
 * helper.onSocketNotification("add", async (a, b) => {
 *   // simulate a long-running calculation
 *   await delay(1000);
 *   // return the result to send it back to the client
 *   return a + b;
 * });
 *
 * // `sendSocketNotification` sends a socket notification every second
 * const id = setInterval(() => helper.sendSocketNotification("hello", payload), 1000);
 * // `cleanup` clears the interval when the helper is stopped. Can be called multiple times
 * helper.cleanup(() => clearInterval(id));
 *
 * // `get` handles HTTP requests with an Express router. Paths are relative to the
 * // module name, i.e. /my_module/add/2/to/2
 * helper.get("/add/:a/to/:b", (req, res, next) => {
 *   const a = req.params.a;
 *   const b = req.params.b;
 *   res.json(a + b);
 * });
 *
 *
 */

import { AnyJson } from "..";
import express from "express";
import SocketIO from "socket.io";
import mitt from "mitt";
import { Router } from "express";

class Helper {
  constructor(io: SocketIO.Server, helperPath: string) {
    this.io = io;
  }

  onSocketNotification(notification: string, cb: NotificationCallback) {}
  sendSocketNotification(notification: string, payload: AnyJson) {}
  cleanup(cleanFn: CleanFn) {
    this.cleanFns.push(cleanFn);
  }

  private cleanFns: CleanFn[] = [];
  private router = express.Router();
  private io: SocketIO.Server;
}

let currentHelper: Helper | null = null;
const allHelpers = new Map<string, Helper>();

export const helper = {
  onSocketNotification(notification: string, cb: NotificationCallback) {
    if (!currentHelper) {
      throw new Error("Failed to call internal_prerequire");
    }
    currentHelper.onSocketNotification(notification, cb);
  },
};

type NotificationCallback = (...args: any[]) => AnyJson | Promise<AnyJson>;
type CleanFn = () => void | Promise<void>;

/******** New API ********/
// let currentPath = "";
// export function internal_prerequire(nextPath: string) {
//   currentPath = nextPath;
// }
// export function internal_postrequire() {
//   currentPath = "";
// }
// export function on(
//   notification: string,
//   handler: (...args: any[]) => AnyJson | Promise<AnyJson>
// ) {
//   if (!currentPath) {
//     throw new Error("Failed to call internal_prerequire");
//   }
//   let helper = helpers.get(currentPath);
//   if (!helper) {
//     helper = new NodeHelper(currentPath);
//     helpers.set(currentPath, helper);
//   }
//   helper.emitter.on(notification, handler);
// }
