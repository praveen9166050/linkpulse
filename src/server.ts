import { createServer, type Server } from "node:http";
import type { DatabaseConnection } from "#src/databases/mongo.connection.ts";
import { createApp } from "./app.ts";

export interface ServerOptions {
    /** Port to listen on. 0 asks the OS for any free port (used by tests). */
    readonly port: number;
    readonly host?: string;
    /** The public address for short URLs. Defaults to the address the server listens on. */
    readonly publicBaseUrl?: string | undefined;
    /** The app's one database connection, opened by the caller. */
    readonly database: DatabaseConnection;
    /** Override the links collection (tests use one per test file). */
    readonly linksCollection?: string;
    /** Origins whose pages may call the API from a browser (CORS). */
    readonly corsOrigins?: readonly string[];
    /** Mount the dev-only endpoints (the live request stream). */
    readonly devTools?: boolean;
    /** On stop(), how long open requests get to finish before being cut. Default 5 s. */
    readonly shutdownGraceMs?: number;
    /** Event-loop p99 (ms) above which /health reports degraded. Default 200. */
    readonly healthEventLoopP99LimitMs?: number;
}

export interface RunningServer {
    /** Where the server can be reached, for example `http://127.0.0.1:3000`. */
    readonly baseUrl: string;
    /** Stops accepting connections and resolves once open requests finish. */
    stop(): Promise<void>;
}

/** Loopback only: reachable from this machine, not from the network. */
const DEFAULT_HOST = "127.0.0.1";

const DEFAULT_SHUTDOWN_GRACE_MS = 5000;

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
    server.on(
        "request",
        createApp({
            publicBaseUrl: options.publicBaseUrl ?? baseUrl,
            database: options.database,
            linksCollection: options.linksCollection,
            corsOrigins: options.corsOrigins,
            devTools: options.devTools,
            healthEventLoopP99LimitMs: options.healthEventLoopP99LimitMs,
        }),
    );

    const graceMs = options.shutdownGraceMs ?? DEFAULT_SHUTDOWN_GRACE_MS;
    return { baseUrl, stop: () => close(server, graceMs) };
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
 * Graceful shutdown WITH A DEADLINE: stop accepting new connections and let
 * in-flight requests finish, but only for `graceMs`. Some responses never
 * finish on their own (a live SSE stream), and a shutdown that waits for
 * them waits forever; after the grace period, remaining connections are cut.
 * Idle keep-alive connections are closed straight away (Node 19+).
 */
function close(server: Server, graceMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const deadline = setTimeout(() => server.closeAllConnections(), graceMs);
        deadline.unref(); // the timer alone must not keep the process alive

        server.close((error) => {
            clearTimeout(deadline);
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
