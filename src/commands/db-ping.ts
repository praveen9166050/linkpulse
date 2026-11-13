/**
 * COMMAND: `npm run db:ping`. Checks that this machine can reach MongoDB
 * with the settings in .env: connects, sends a `ping`, reports the time.
 *
 * Never prints the connection string: it contains the password.
 */
import { loadAppConfig } from "#src/config/app.config.ts";
import { connectMongo } from "#src/databases/mongo.connection.ts";

const config = loadAppConfig();
const host = URL.parse(config.mongodb.uri)?.host ?? "(unparseable host)";

process.stdout.write(`Connecting to ${host}, database "${config.mongodb.database}"...\n`);
const started = performance.now();

try {
    const connection = await connectMongo(config.mongodb);

    const db = connection.db;
    if (!db) throw new Error("Connected, but no database handle is available");
    await db.command({ ping: 1 });
    const elapsed = Math.round(performance.now() - started);

    process.stdout.write(`OK: connected and pinged in ${String(elapsed)} ms\n`);
    await connection.close();
} catch (error) {
    process.stderr.write(`FAILED: ${explain(error)}\n`);
    process.exitCode = 1;
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
