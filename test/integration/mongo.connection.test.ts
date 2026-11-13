/**
 * INTEGRATION TEST: DatabaseConnection really reaches MongoDB.
 * Uses the settings from .env, but always the TEST database.
 */
import { describe, expect, it } from "vitest";
import { loadAppConfig } from "#src/config/app.config.ts";
import { DatabaseConnection } from "#src/databases/mongo.connection.ts";
import { TEST_DATABASE } from "#test/shared/test-database.ts";

function testDatabaseConnection(): DatabaseConnection {
    const { uri } = loadAppConfig().mongodb;
    return new DatabaseConnection({ uri, database: TEST_DATABASE });
}

describe("DatabaseConnection", () => {
    it("connects to the configured database, answers a ping, and closes cleanly", async () => {
        const database = testDatabaseConnection();

        await database.connect();
        const connection = database.connection;
        try {
            expect(database.isConnected).toBe(true);
            expect(connection.name).toBe(TEST_DATABASE);
            expect(await database.ping()).toBeGreaterThanOrEqual(0); // round trip in ms
        } finally {
            await database.close();
        }

        expect(database.isConnected).toBe(false);
        expect(connection.readyState).toBe(0); // 0 = disconnected
        expect(() => database.connection).toThrow(/call connect\(\) first/);
    });

    it("refuses to connect twice (that would open a second pool)", async () => {
        const database = testDatabaseConnection();
        await database.connect();
        try {
            await expect(database.connect()).rejects.toThrow(/already connected/);
        } finally {
            await database.close();
        }
    });

    it("can be closed twice", async () => {
        const database = testDatabaseConnection();
        await database.connect();

        await database.close();
        await expect(database.close()).resolves.toBeUndefined();
    });
});
