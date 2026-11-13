/**
 * UNIT TEST: the rules DatabaseConnection enforces before any network call.
 * (Connecting for real is covered in test/integration/mongo.connection.test.ts.)
 */
import { describe, expect, it } from "vitest";
import { DatabaseConnection } from "../mongo.connection.ts";

const settings = { uri: "mongodb://127.0.0.1:1/unused", database: "linkpulse_test" };

describe("DatabaseConnection before connect()", () => {
    it("is not connected", () => {
        expect(new DatabaseConnection(settings).isConnected).toBe(false);
    });

    it("refuses to hand out a connection, naming the missing step", () => {
        const database = new DatabaseConnection(settings);

        expect(() => database.connection).toThrow(/call connect\(\) first/);
    });

    it("refuses to ping", async () => {
        await expect(new DatabaseConnection(settings).ping()).rejects.toThrow(
            /call connect\(\) first/,
        );
    });

    it("closes without error (nothing to close)", async () => {
        await expect(new DatabaseConnection(settings).close()).resolves.toBeUndefined();
    });

    it("knows its database name without connecting", () => {
        expect(new DatabaseConnection(settings).databaseName).toBe("linkpulse_test");
    });
});
