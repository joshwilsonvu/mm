/* Magic Mirror
 * Node Helper Superclass
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

import path from "path";
import express from "express";
import type SocketIO from "socket.io";
import { serverSocketEmitter } from "@mm/hooks/dist/server-notification";
import type mitt from "mitt";

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
	get expressApp() { return this.router; }
	set expressApp(val: express.Router) { this.router = val; }
	/**
	 * This is a link to the IO instance. It will allow you to do some Socket.IO magic. In most cases you won't need this,
	 * since the Node Helper has a few convenience methods to make this simple.
	 */
	io?: SocketIO.Server;

  constructor(io: SocketIO.Server) {
		this.path = __dirname;
		this.name = path.basename(this.path);
		this.router = express.Router();
		const publicPath = path.join(this.path, "public");
		this.router.use("/" + this.name, express.static(publicPath));
		this.io = io;

		const emitter = serverSocketEmitter(io, this.name);
		this.on = emitter.on;
		this.off = emitter.off;
		this.emit = emitter.emit;
		this.on("*", this.socketNotificationReceived.bind(this));

		this.init();
	}

	init() {
		console.log("Initializing new module helper ...");
	}

	/**
	 * @deprecated
	 */
	loaded() {}

	start() {
		console.log("Starting module helper: " + this.name);
	}

	/**
	 * Called when the MagicMirror server receives a `SIGINT`
	 * Close any open connections, stop any sub-processes and
	 * gracefully exit the module.
	 *
	 */
	stop() {
		console.log("Stopping module helper: " + this.name);
	}

	/**
	 * This method is called when a socket notification arrives.
	 *
	 * argument notification string - The identifier of the notification.
	 * argument payload mixed - The payload of the notification.
	 * @deprecated
	 */
	socketNotificationReceived(notification?: string, payload?: any) {
		console.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
	}

	on: mitt.Emitter["on"];
	off: mitt.Emitter["off"];
	emit: mitt.Emitter["emit"];

	/* sendSocketNotification(notification, payload)
	 * Send a socket notification to the module.
	 *
	 * argument notification string - The identifier of the notificatiopn.
	 * argument payload mixed - The payload of the notification.
	 */
	get sendSocketNotification() { return this.emit; }


	/*
	 * NodeHelper.create({ ...methods }) is just an alternative to
	 *     class MyNodeHelper extends NodeHelper {
	 *       ...methods
	 *     }
	 * and using the ES6 class syntax is recommended.
	 */
	static create(moduleDefinition: Record<string, any>) {
		class Subclass extends NodeHelper {}
		Object.assign(Subclass.prototype, moduleDefinition);
		return Subclass as typeof NodeHelper;
	}
};


