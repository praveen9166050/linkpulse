/**
 * How a link is STORED in MongoDB: the persistence shape, separate from
 * the `Link` entity (the domain shape). The repository maps between them,
 * so storage details (field names, `_id`) never leak into business logic.
 *
 * `_id` is the short code itself. MongoDB guarantees `_id` is unique and
 * indexed, so "is this code taken?" and "find by code" both use the
 * built-in primary key: no extra index needed, and a duplicate insert
 * fails atomically on the server.
 */
import { Schema, type Connection, type Model } from "mongoose";

export interface LinkDocument {
    /** The short code, case-sensitive (stored exactly as given). */
    readonly _id: string;
    /** The canonical target URL. */
    readonly target: string;
    readonly createdAt: Date;
}

export const LINKS_COLLECTION = "links";

const linkSchema = new Schema<LinkDocument>(
    {
        _id: { type: String, required: true },
        target: { type: String, required: true },
        createdAt: { type: Date, required: true },
    },
    {
        // No `__v` version field: links are never updated concurrently yet.
        versionKey: false,
    },
);

/**
 * The Mongoose model for links in `collection`, on `connection`.
 * Reuses an already-compiled model, since Mongoose refuses to compile the
 * same model name twice on one connection.
 */
export function linkModel(
    connection: Connection,
    collection = LINKS_COLLECTION,
): Model<LinkDocument> {
    const name = `Link:${collection}`;
    return (
        (connection.models[name] as Model<LinkDocument> | undefined) ??
        connection.model<LinkDocument>(name, linkSchema, collection)
    );
}
