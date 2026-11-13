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
import { connectMongo } from "#src/databases/mongo.connection.ts";
import { startServer } from "#src/server.ts";

try {
    const config = loadAppConfig();

    const mongo = await connectMongo(config.mongodb);
    process.stdout.write(`Connected to MongoDB database "${config.mongodb.database}"\n`);

    const server = await startServer({
        port: config.port,
        publicBaseUrl: config.publicBaseUrl,
        mongo,
    });
    process.stdout.write(`LinkPulse API listening on ${server.baseUrl}\n`);

    // Ctrl+C sends SIGINT; platforms such as Kubernetes send SIGTERM to stop a process.
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.once(signal, () => {
            process.stdout.write(`${signal} received: finishing open requests...\n`);
            void server
                .stop()
                .then(() => mongo.close())
                .then(() => {
                    process.stdout.write("Shut down cleanly.\n");
                    process.exit(0);
                });
        });
    }
} catch (error) {
    // A clear one-line reason (bad config, unreachable database), not a stack trace.
    process.stderr.write(
        `LinkPulse failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
}
