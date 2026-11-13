/**
 * The app's configuration, read from environment variables (12-factor
 * apps: the same code runs everywhere; only the environment differs).
 *
 * Validated once at startup: a missing or wrong value stops the app with a
 * clear message (fail fast), instead of failing later on the first request.
 */
import { existsSync } from "node:fs";
import { ConfigError } from "#src/errors/config.error.ts";

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;

/** Letters, digits, `_` and `-`: always safe as a MongoDB database name. */
const DATABASE_NAME = /^[A-Za-z0-9_-]{1,38}$/;

export interface AppConfig {
    readonly port: number;
    /** The public address for short URLs; undefined means "where the server listens". */
    readonly publicBaseUrl: string | undefined;
    readonly mongodb: {
        /** Full connection string. Contains a password: never log it. */
        readonly uri: string;
        readonly database: string;
    };
    /** Origins (scheme + host + port) whose pages may call the API from a browser. */
    readonly corsOrigins: readonly string[];
    /** Dev-only endpoints, such as the live request stream. Off unless "true". */
    readonly devTools: boolean;
}

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Loads `.env` if present, then validates `process.env`.
 * Variables already set in the environment win over `.env`.
 *
 * @throws ConfigError listing every problem found
 */
export function loadAppConfig(envFile = ".env"): AppConfig {
    if (existsSync(envFile)) process.loadEnvFile(envFile);
    return parseAppConfig(process.env);
}

/** Validates raw environment variables. Pure, so it's easy to test. */
export function parseAppConfig(env: Env): AppConfig {
    const problems: string[] = [];

    const port = parsePort(env.PORT, problems);
    const publicBaseUrl = parsePublicBaseUrl(env.PUBLIC_BASE_URL, problems);
    const uri = parseMongoUri(env.MONGODB_URI, problems);
    const database = parseDatabaseName(env.MONGODB_DATABASE, problems);
    const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS, problems);
    const devTools = parseDevTools(env.DEV_TOOLS, problems);

    if (problems.length > 0) throw new ConfigError(problems);
    return { port, publicBaseUrl, mongodb: { uri, database }, corsOrigins, devTools };
}

function parsePort(value: string | undefined, problems: string[]): number {
    if (value === undefined || value === "") return DEFAULT_PORT;
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
        problems.push(`PORT must be a whole number from 0 to ${String(MAX_PORT)} (got "${value}")`);
    }
    return port;
}

function parsePublicBaseUrl(value: string | undefined, problems: string[]): string | undefined {
    if (value === undefined || value === "") return undefined;
    const url = URL.parse(value);
    if (url === null || !["http:", "https:"].includes(url.protocol)) {
        problems.push(`PUBLIC_BASE_URL must be an http or https URL (got "${value}")`);
    }
    // No trailing slash, so `${publicBaseUrl}/${code}` never doubles it.
    return value.replace(/\/+$/, "");
}

function parseMongoUri(value: string | undefined, problems: string[]): string {
    if (value === undefined || value === "") {
        problems.push("MONGODB_URI is required (see .env.example)");
        return "";
    }
    if (!value.startsWith("mongodb://") && !value.startsWith("mongodb+srv://")) {
        // Don't echo the value: it may contain a password.
        problems.push("MONGODB_URI must start with mongodb:// or mongodb+srv://");
    }
    if (value.includes("<db_password>")) {
        problems.push("MONGODB_URI still contains the <db_password> placeholder");
    }
    return value;
}

function parseDatabaseName(value: string | undefined, problems: string[]): string {
    if (value === undefined || value === "") {
        problems.push("MONGODB_DATABASE is required (see .env.example)");
        return "";
    }
    if (!DATABASE_NAME.test(value)) {
        problems.push(`MONGODB_DATABASE must be 1-38 letters, digits, _ or - (got "${value}")`);
    }
    return value;
}

/**
 * A comma-separated allow-list. Each entry must be exactly an ORIGIN
 * (scheme://host[:port]), which is what browsers send in the Origin header:
 * no path, no trailing slash, and never "*" (any site at all).
 */
function parseCorsOrigins(value: string | undefined, problems: string[]): readonly string[] {
    if (value === undefined) return [];
    const entries = value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry !== "");
    for (const entry of entries) {
        const url = URL.parse(entry);
        const isOrigin =
            url !== null && ["http:", "https:"].includes(url.protocol) && url.origin === entry;
        if (!isOrigin) {
            problems.push(
                `CORS_ORIGINS entries must be origins like http://localhost:3001 (got "${entry}")`,
            );
        }
    }
    return entries;
}

/** Only the exact words: a typo such as "ture" must not quietly switch dev tools on. */
function parseDevTools(value: string | undefined, problems: string[]): boolean {
    if (value === undefined || value === "" || value === "false") return false;
    if (value === "true") return true;
    problems.push(`DEV_TOOLS must be "true" or "false" (got "${value}")`);
    return false;
}
