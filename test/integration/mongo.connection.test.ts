/**
 * INTEGRATION TEST: the shared connection really reaches MongoDB.
 * Uses the settings from .env, but always the TEST database.
 */
import { describe, expect, it } from "vitest";
import { loadAppConfig } from "#src/config/app.config.ts";
import { connectMongo } from "#src/databases/mongo.connection.ts";

const TEST_DATABASE = "linkpulse_test";

describe("connectMongo", () => {
    it("connects to the configured cluster, answers a ping, and closes cleanly", async () => {
        const { uri } = loadAppConfig().mongodb;

        const connection = await connectMongo({ uri, database: TEST_DATABASE });
        try {
            expect(connection.name).toBe(TEST_DATABASE);
            expect(await connection.db?.command({ ping: 1 })).toMatchObject({ ok: 1 });
        } finally {
            await connection.close();
        }

        expect(connection.readyState).toBe(0); // 0 = disconnected
    });
});
