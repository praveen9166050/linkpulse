import type { Connection, Model } from "mongoose";
import { isDuplicateKeyError } from "#src/databases/mongo-errors.ts";
import { ShortCode } from "../../short-code.value-object.ts";
import { TargetUrl } from "../../target-url.value-object.ts";
import { Link } from "../entities/link.entity.ts";
import { linkModel, type LinkDocument } from "../entities/link.schema.ts";

export type AddLinkOutcome = "added" | "code_taken";

export interface LinkRepositoryOptions {
    /** Override the collection name (tests use one collection per test file). */
    readonly collection?: string;
}

/**
 * REPOSITORY: stores and finds links in MongoDB.
 *
 * Takes the app's shared connection; never opens its own (one pool for the
 * whole app). Maps between the `Link` entity and its stored document, so
 * no MongoDB detail reaches the service.
 */
export class LinkRepository {
    readonly #model: Model<LinkDocument>;

    constructor(connection: Connection, options: LinkRepositoryOptions = {}) {
        this.#model = linkModel(connection, options.collection);
    }

    /**
     * Stores a new link ONLY IF its code is free, as one atomic step.
     *
     * Never "check, then save": two requests could both see the code free
     * and one would overwrite the other. Instead we just insert: `_id` is
     * unique, so MongoDB itself rejects the second insert with a
     * duplicate-key error (E11000), which means the code is taken.
     */
    async add(link: Link): Promise<AddLinkOutcome> {
        try {
            await this.#model.create(toDocument(link));
            return "added";
        } catch (error) {
            if (isDuplicateKeyError(error)) return "code_taken";
            throw error;
        }
    }

    async findByCode(code: ShortCode): Promise<Link | undefined> {
        // lean(): a plain object instead of a full Mongoose document, which
        // is faster, and we turn it into a domain Link anyway.
        const document = await this.#model.findById(code.value).lean<LinkDocument>().exec();
        return document ? toLink(document) : undefined;
    }
}

function toDocument(link: Link): LinkDocument {
    return { _id: link.code.value, target: link.target.value, createdAt: link.createdAt };
}

/**
 * Rebuilds a domain Link through its value objects, so even data read from
 * the database is validated. A stored document breaking a rule (edited by
 * hand, or written by old code) throws, and becomes a 500, rather than
 * slipping through.
 */
function toLink(document: LinkDocument): Link {
    return Link.create({
        code: ShortCode.create(document._id),
        target: TargetUrl.create(document.target),
        createdAt: document.createdAt,
    });
}
