import { createServer, type Server } from "node:http";
import { createApp } from "./app.ts";

export interface ServerOptions {
    /** Port to listen on. 0 asks the OS for any free port (used by tests). */
    readonly port: number;
    readonly host?: string;
    /** The public address for short URLs. Defaults to the address the server listens on. */
    readonly publicBaseUrl?: string;
}

export interface RunningServer {
    /** Where the server can be reached, for example `http://127.0.0.1:3000`. */
    readonly baseUrl: string;
    /** Stops accepting connections and resolves once open requests finish. */
    stop(): Promise<void>;
}

/** Loopback only: reachable from this machine, not from the network. */
const DEFAULT_HOST = "127.0.0.1";

/** Starts the LinkPulse API and resolves once it is listening. */
export async function startServer(options: ServerOptions): Promise<RunningServer> {
    const host = options.host ?? DEFAULT_HOST;
    const server = createServer();

    await listen(server, options.port, host);

    // The real port is only known after listening (port 0 means "any"),
    // so the app is built now. This runs before the event loop can deliver
    // any request, so no request is missed.
    const baseUrl = `http://${host}:${String(boundPort(server))}`;

    // An Express app is a plain node:http request listener, so the server,
    // listen() and graceful shutdown stay exactly as they were.
    server.on("request", createApp({ publicBaseUrl: options.publicBaseUrl ?? baseUrl }));

    return { baseUrl, stop: () => close(server) };
}

/**
 * `listen()` reports success through a callback and failure (for example
 * the port is taken) through an "error" event; this turns both into one
 * Promise so callers can simply `await` it.
 */
function listen(server: Server, port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
            server.off("error", reject);
            resolve();
        });
    });
}

/**
 * Graceful shutdown: stop accepting new connections, let in-flight
 * requests finish, then resolve. Idle keep-alive connections are closed
 * straight away (Node 19+), so this doesn't hang waiting on them.
 */
function close(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

/** The port actually bound, which differs from the requested one when it was 0. */
function boundPort(server: Server): number {
    const address = server.address();
    if (address === null || typeof address === "string") {
        throw new Error("Expected the server to be listening on a TCP port");
    }
    return address.port;
}
