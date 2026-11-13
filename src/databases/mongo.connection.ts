/**
 * The app's ONE MongoDB connection.
 *
 * A Mongoose connection is not a single socket: it manages a POOL of open,
 * already-authenticated TLS connections that queries borrow and return.
 * Opening one costs several network round trips (TCP, TLS, auth), so the
 * whole app shares a single pool, created at startup and closed at
 * shutdown, instead of connecting per request or per feature.
 *
 * `createConnection` returns the connection instead of setting up
 * Mongoose's hidden global one, so it is passed to whatever needs it:
 * tests can hand in a connection to the test database.
 */
import mongoose, { type Connection } from "mongoose";

/** Fail in 10 s rather than the driver's default 30 s when the cluster is unreachable. */
const SERVER_SELECTION_TIMEOUT_MS = 10_000;

/**
 * At most this many connections in the pool (the driver's default is 100).
 * Atlas's free tier allows 500 connections in total, shared by every app
 * instance and tool, so each instance takes a modest share.
 */
const MAX_POOL_SIZE = 10;

export interface MongoSettings {
    /** Full connection string. Contains a password: never log it. */
    readonly uri: string;
    readonly database: string;
}

/**
 * Owns the connection pool's whole lifecycle: connect, use, ping, close.
 *
 * A class, not functions, because it holds STATE (connected or not) and
 * guards it: using the connection before `connect()` fails with a clear
 * message instead of a confusing `undefined` somewhere deeper.
 */
export class DatabaseConnection {
    // `#` = truly private at runtime (not just to the type checker), and
    // erasable syntax that Node can run directly.
    readonly #settings: MongoSettings;
    #connection: Connection | undefined;

    constructor(settings: MongoSettings) {
        this.#settings = settings;
    }

    get databaseName(): string {
        return this.#settings.database;
    }

    get isConnected(): boolean {
        return this.#connection !== undefined;
    }

    /** The Mongoose connection, for repositories. Only after `connect()`. */
    get connection(): Connection {
        if (!this.#connection) {
            throw new Error("The database is not connected: call connect() first");
        }
        return this.#connection;
    }

    /** Opens the pool and resolves once MongoDB is reachable. */
    async connect(): Promise<void> {
        if (this.#connection) {
            throw new Error("The database is already connected (a second pool is never wanted)");
        }
        this.#connection = await mongoose
            .createConnection(this.#settings.uri, {
                dbName: this.#settings.database,
                serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
                maxPoolSize: MAX_POOL_SIZE,
            })
            .asPromise();
    }

    /** Sends MongoDB a `ping` and resolves with the round trip in milliseconds. */
    async ping(): Promise<number> {
        const db = this.connection.db;
        if (!db) throw new Error("Connected, but no database handle is available");

        const started = performance.now();
        await db.command({ ping: 1 });
        return Math.round(performance.now() - started);
    }

    /** Closes the pool. Safe to call when not connected, or twice. */
    async close(): Promise<void> {
        const connection = this.#connection;
        if (!connection) return;

        this.#connection = undefined;
        await connection.close();
    }
}
