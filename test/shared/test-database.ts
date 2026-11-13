/**
 * A real MongoDB test database for one test file.
 *
 * Test files run in parallel, so each gets its OWN uniquely named
 * collection in linkpulse_test: one file's cleanup can never delete
 * another file's data mid-test. Uses the cluster and user from .env, but
 * never the dev database.
 */
import { randomUUID } from "node:crypto";
import type { Connection } from "mongoose";
import { loadAppConfig } from "#src/config/app.config.ts";
import { DatabaseConnection } from "#src/databases/mongo.connection.ts";

/** The only database tests may touch (the app user can write only here and linkpulse_dev). */
export const TEST_DATABASE = "linkpulse_test";

export interface TestDatabase {
    readonly connection: Connection;
    /** This test file's private collection for links. */
    readonly linksCollection: string;
    /** Empties the collection, for a clean slate between tests. */
    clear(): Promise<void>;
    /** Drops the collection and closes the connection. Call once, after all tests. */
    dispose(): Promise<void>;
}

export async function connectTestDatabase(): Promise<TestDatabase> {
    const { uri } = loadAppConfig().mongodb;
    const database = new DatabaseConnection({ uri, database: TEST_DATABASE });
    await database.connect();
    const connection = database.connection;
    const linksCollection = `links_test_${randomUUID().slice(0, 8)}`;

    return {
        connection,
        linksCollection,
        async clear() {
            await connection.collection(linksCollection).deleteMany({});
        },
        async dispose() {
            try {
                await connection.dropCollection(linksCollection);
            } catch {
                // Never created (no test inserted anything): nothing to drop.
            }
            await database.close();
        },
    };
}
