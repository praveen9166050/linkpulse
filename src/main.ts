/**
 * Entry point: `npm start`. Reads configuration from the environment,
 * starts the API, and shuts down gracefully on Ctrl+C (SIGINT) or when a
 * platform such as Kubernetes asks it to stop (SIGTERM).
 */
import { startServer } from "./server.ts";

const DEFAULT_PORT = 3000;

const port = parsePort(process.env.PORT);
const server = await startServer({ port, publicBaseUrl: process.env.PUBLIC_BASE_URL });

process.stdout.write(`LinkPulse API listening on ${server.baseUrl}\n`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
        process.stdout.write(`${signal} received, finishing open requests...\n`);
        void server.stop().then(() => process.exit(0));
    });
}

function parsePort(value: string | undefined): number {
    if (value === undefined) return DEFAULT_PORT;
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
        throw new Error(`PORT must be a whole number from 0 to 65535, got "${value}"`);
    }
    return port;
}
