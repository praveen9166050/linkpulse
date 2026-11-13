import { describe, expect, it } from "vitest";
import { ConfigError } from "#src/errors/config.error.ts";
import { thrownBy } from "#test/shared/thrown.ts";
import { parseAppConfig } from "../app.config.ts";

const VALID = {
    MONGODB_URI: "mongodb+srv://app:secret@cluster0.example.mongodb.net/?retryWrites=true",
    MONGODB_DATABASE: "linkpulse_dev",
};

/** The problems reported for an environment parseAppConfig must reject. */
function problemsWith(env: Record<string, string | undefined>): readonly string[] {
    const error = thrownBy(() => parseAppConfig(env));
    if (!(error instanceof ConfigError)) throw error;
    return error.problems;
}

describe("parseAppConfig", () => {
    it("reads a valid environment, with defaults for optional values", () => {
        expect(parseAppConfig(VALID)).toEqual({
            port: 3000,
            publicBaseUrl: undefined,
            mongodb: { uri: VALID.MONGODB_URI, database: "linkpulse_dev" },
        });
    });

    it("reads PORT and PUBLIC_BASE_URL, dropping a trailing slash", () => {
        const config = parseAppConfig({
            ...VALID,
            PORT: "8080",
            PUBLIC_BASE_URL: "https://lnkp.dev/",
        });

        expect(config.port).toBe(8080);
        expect(config.publicBaseUrl).toBe("https://lnkp.dev");
    });

    it("reports every problem at once, so they can all be fixed in one go", () => {
        expect(problemsWith({ PORT: "99999" })).toEqual([
            'PORT must be a whole number from 0 to 65535 (got "99999")',
            "MONGODB_URI is required (see .env.example)",
            "MONGODB_DATABASE is required (see .env.example)",
        ]);
    });

    it("rejects a URI that isn't a MongoDB one, without echoing it (it may hold a password)", () => {
        const problems = problemsWith({ ...VALID, MONGODB_URI: "postgres://u:hunter2@db" });

        expect(problems).toEqual(["MONGODB_URI must start with mongodb:// or mongodb+srv://"]);
        expect(problems.join(" ")).not.toContain("hunter2");
    });

    it("rejects a URI still holding the .env.example placeholder", () => {
        expect(
            problemsWith({
                ...VALID,
                MONGODB_URI: "mongodb+srv://app:<db_password>@cluster0.example.mongodb.net/",
            }),
        ).toEqual(["MONGODB_URI still contains the <db_password> placeholder"]);
    });

    it.each(["has space", "a/b", "dot.ted", "x".repeat(39)])(
        "rejects %j as a database name",
        (name) => {
            expect(problemsWith({ ...VALID, MONGODB_DATABASE: name })).toHaveLength(1);
        },
    );

    it("rejects a PUBLIC_BASE_URL that isn't http or https", () => {
        expect(problemsWith({ ...VALID, PUBLIC_BASE_URL: "ftp://lnkp.dev" })).toEqual([
            'PUBLIC_BASE_URL must be an http or https URL (got "ftp://lnkp.dev")',
        ]);
    });
});
