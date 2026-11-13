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

/** Opens the connection pool and resolves once MongoDB is reachable. */
export async function connectMongo(settings: MongoSettings): Promise<Connection> {
    return mongoose
        .createConnection(settings.uri, {
            dbName: settings.database,
            serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
            maxPoolSize: MAX_POOL_SIZE,
        })
        .asPromise();
}
