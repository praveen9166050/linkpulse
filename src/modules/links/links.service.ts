import { InvalidShortCodeError } from "#src/errors/invalid-short-code.error.ts";
import { InvalidTargetUrlError } from "#src/errors/invalid-target-url.error.ts";
import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import { ConflictError } from "#src/errors/response-errors/conflict.error.ts";
import { NotFoundError } from "#src/errors/response-errors/not-found.error.ts";
import type { FieldError } from "#src/response-helper.ts";
import type { ClockService } from "#src/services/clock.service.ts";
import { Link } from "./database/entities/link.entity.ts";
import type { LinkRepository } from "./database/repositories/link.repository.ts";
import type { CreateLinkDto } from "./dto/create-link.dto.ts";
import type { ListLinksDto } from "./dto/list-links.dto.ts";
import { decodeLinkCursor, encodeLinkCursor } from "./link-cursor.ts";
import type { ShortCodeGeneratorService } from "./short-code-generator.service.ts";
import { ShortCode } from "./short-code.value-object.ts";
import { TargetUrl } from "./target-url.value-object.ts";

/**
 * Random codes collide very rarely (62^7 ≈ 3.5 trillion codes), so a few
 * retries are plenty. Running out means something is broken, such as a
 * generator that keeps returning the same code: that is a bug, so it
 * throws a plain Error (a 500), not a client error.
 */
const MAX_GENERATION_ATTEMPTS = 5;

export interface LinksServiceDependencies {
    readonly linkRepository: LinkRepository;
    readonly shortCodeGenerator: ShortCodeGeneratorService;
    readonly clock: ClockService;
}

/**
 * SERVICE: the business logic for links.
 *
 * Expected failures are thrown as ResponseErrors (BadRequestError,
 * ConflictError, NotFoundError); the error-handler middleware turns them
 * into HTTP responses. Anything else thrown is a bug and becomes a 500.
 */
export class LinksService {
    readonly #deps: LinksServiceDependencies;

    constructor(deps: LinksServiceDependencies) {
        this.#deps = deps;
    }

    /**
     * Shortens a URL, with the custom code if given, otherwise a generated one.
     * @throws BadRequestError listing every invalid field at once
     * @throws ConflictError when the custom code is already taken
     */
    async createLink(dto: CreateLinkDto): Promise<Link> {
        const { target, code } = validate(dto);
        const createdAt = this.#deps.clock.now();

        return code
            ? this.#addWithCustomCode(code, target, createdAt)
            : this.#addWithGeneratedCode(target, createdAt);
    }

    /**
     * One page of links, newest first, plus the cursor for the next page.
     * @throws BadRequestError when the cursor isn't one this API produced
     */
    async listLinks(
        query: ListLinksDto,
    ): Promise<{ readonly links: readonly Link[]; readonly nextCursor: string | null }> {
        const after = query.cursor === undefined ? undefined : decodeLinkCursor(query.cursor);
        if (query.cursor !== undefined && !after) {
            throw new BadRequestError("One or more query parameters are invalid.", {
                errors: [
                    {
                        field: "cursor",
                        kind: "invalid",
                        message:
                            "Not a cursor from this API: pass the nextCursor of a previous page.",
                    },
                ],
            });
        }

        const page = await this.#deps.linkRepository.list(
            after ? { limit: query.limit, after } : { limit: query.limit },
        );
        const last = page.links.at(-1);
        return {
            links: page.links,
            nextCursor:
                page.hasMore && last
                    ? encodeLinkCursor({ createdAt: last.createdAt, code: last.code.value })
                    : null,
        };
    }

    /**
     * Finds where a short link points.
     * @throws NotFoundError for an unknown code, or one that can never be valid
     */
    async followLink(rawCode: string): Promise<TargetUrl> {
        const code = tryShortCode(rawCode);
        const link = code ? await this.#deps.linkRepository.findByCode(code) : undefined;
        if (!link) throw linkNotFound(rawCode);
        return link.target;
    }

    async #addWithCustomCode(code: ShortCode, target: TargetUrl, createdAt: Date): Promise<Link> {
        const link = Link.create({ code, target, createdAt });
        if ((await this.#deps.linkRepository.add(link)) === "code_taken") {
            throw new ConflictError(`The code "${code.value}" is already in use. Choose another.`, {
                type: "/problems/code-taken",
                title: "Short code already taken",
            });
        }
        return link;
    }

    async #addWithGeneratedCode(target: TargetUrl, createdAt: Date): Promise<Link> {
        for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
            const code = this.#deps.shortCodeGenerator.generate();
            const link = Link.create({ code, target, createdAt });
            if ((await this.#deps.linkRepository.add(link)) === "added") return link;
        }
        throw new Error(
            `Could not generate a free short code after ${String(MAX_GENERATION_ATTEMPTS)} attempts`,
        );
    }
}

interface ValidInput {
    readonly target: TargetUrl;
    readonly code: ShortCode | undefined;
}

/** Validates every field and reports ALL problems at once, not just the first. */
function validate(dto: CreateLinkDto): ValidInput {
    const errors: FieldError[] = [];
    const { url, code: rawCode } = dto;
    const target = attempt(() => TargetUrl.create(url), "url", errors);
    const code =
        rawCode === undefined
            ? undefined
            : attempt(() => ShortCode.create(rawCode), "code", errors);

    if (errors.length > 0 || !target) {
        throw new BadRequestError("One or more fields are invalid.", { errors });
    }
    return { target, code };
}

/** Runs one value-object factory; on a rule violation, records it and returns undefined. */
function attempt<T>(create: () => T, field: string, errors: FieldError[]): T | undefined {
    try {
        return create();
    } catch (error) {
        if (
            !(error instanceof InvalidShortCodeError) &&
            !(error instanceof InvalidTargetUrlError)
        ) {
            throw error;
        }
        errors.push({ field, kind: error.reason.kind, message: error.message });
        return undefined;
    }
}

/** A string that can't be a valid code is simply not found: no link can have it. */
function tryShortCode(raw: string): ShortCode | undefined {
    try {
        return ShortCode.create(raw);
    } catch (error) {
        if (error instanceof InvalidShortCodeError) return undefined;
        throw error;
    }
}

function linkNotFound(code: string): NotFoundError {
    return new NotFoundError(`No active link has the code "${code}".`, {
        type: "/problems/link-not-found",
        title: "Link not found",
    });
}
