/**
 * COMMAND: `npm run db:ping`. Checks that this machine can reach MongoDB
 * with the settings in .env: connects, sends a `ping`, reports the time.
 *
 * Never prints the connection string: it contains the password.
 */
import { loadAppConfig } from "#src/config/app.config.ts";
import { DatabaseConnection } from "#src/databases/mongo.connection.ts";

const config = loadAppConfig();
const host = URL.parse(config.mongodb.uri)?.host ?? "(unparseable host)";
const database = new DatabaseConnection(config.mongodb);

process.stdout.write(`Connecting to ${host}, database "${database.databaseName}"...\n`);
const started = performance.now();

try {
    await database.connect();
    const connected = Math.round(performance.now() - started);
    const roundTrip = await database.ping();

    process.stdout.write(
        `OK: connected in ${String(connected)} ms, ping round trip ${String(roundTrip)} ms\n`,
    );
} catch (error) {
    process.stderr.write(`FAILED: ${explain(error)}\n`);
    process.exitCode = 1;
} finally {
    await database.close(); // does nothing if connect() failed
}

/** Turns the most common connection failures into a likely cause. */
function explain(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "";

    if (/bad auth|authentication failed/i.test(message)) {
        return "authentication failed. Check the user and password in MONGODB_URI.";
    }
    if (name === "MongooseServerSelectionError" || name === "MongoServerSelectionError") {
        return (
            "couldn't reach the cluster. Is this machine's IP in Atlas > Network Access? " +
            `(${message})`
        );
    }
    return message;
}
