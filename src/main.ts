/**
 * Entry point: `npm start`.
 *
 * STARTUP, dependencies first:   config -> database -> HTTP server
 * SHUTDOWN, in reverse:          HTTP server (finish open requests) -> database
 *
 * Starting the server only once the database is reachable means no request
 * is accepted that couldn't be served. Closing the database only after the
 * server has drained means no in-flight request loses its connection.
 */
import { loadAppConfig } from "#src/config/app.config.ts";
import { DatabaseConnection } from "#src/databases/mongo.connection.ts";
import { type RunningServer, startServer } from "#src/server.ts";

let database: DatabaseConnection | undefined;

try {
    const config = loadAppConfig();

    database = new DatabaseConnection(config.mongodb);
    await database.connect();
    process.stdout.write(`Connected to MongoDB database "${database.databaseName}"\n`);

    const server = await startServer({
        port: config.port,
        publicBaseUrl: config.publicBaseUrl,
        database,
    });
    process.stdout.write(`LinkPulse API listening on ${server.baseUrl}\n`);

    shutDownGracefullyOnSignal(server, database);
} catch (error) {
    // A clear one-line reason (bad config, unreachable database, port taken), not a stack trace.
    process.stderr.write(
        `LinkPulse failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
    // An open pool keeps the process alive: close it, or a failed start would hang.
    await database?.close();
}

/** Ctrl+C sends SIGINT; platforms such as Kubernetes send SIGTERM to stop a process. */
function shutDownGracefullyOnSignal(server: RunningServer, db: DatabaseConnection): void {
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.once(signal, () => {
            process.stdout.write(`${signal} received: finishing open requests...\n`);
            void server
                .stop()
                .then(() => db.close())
                .then(() => {
                    process.stdout.write("Shut down cleanly.\n");
                    process.exit(0);
                });
        });
    }
}
