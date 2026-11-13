import { err, ok, type Result } from "../../../shared/result.ts";
import { Link } from "../domain/link.ts";
import { ShortCode, type ShortCodeError } from "../domain/short-code.ts";
import { TargetUrl, type TargetUrlError } from "../domain/target-url.ts";
import type { Clock, CodeGenerator, LinkRepository } from "./ports.ts";

/**
 * Random codes collide very rarely (step C covers the odds), so a few
 * retries are plenty. Running out means something is broken, such as a
 * generator that keeps returning the same code: that is a bug, so it
 * throws instead of returning an error.
 */
const MAX_GENERATION_ATTEMPTS = 5;

/** Raw input, straight from the request. */
export interface CreateLinkInput {
    readonly url: string;
    readonly code?: string;
}

export type InvalidField =
    | { readonly field: "url"; readonly error: TargetUrlError }
    | { readonly field: "code"; readonly error: ShortCodeError };

export type CreateLinkError =
    | { readonly kind: "invalid_input"; readonly errors: readonly InvalidField[] }
    | { readonly kind: "code_taken"; readonly code: string };

export interface CreateLinkDependencies {
    readonly links: LinkRepository;
    readonly codes: CodeGenerator;
    readonly clock: Clock;
}

/**
 * USE CASE: shorten a URL, with a custom code or a generated one.
 *
 * Expected failures (bad input, a taken custom code) come back as a
 * Result; the HTTP layer maps them to 400 and 409.
 */
export class CreateLink {
    readonly #deps: CreateLinkDependencies;

    constructor(deps: CreateLinkDependencies) {
        this.#deps = deps;
    }

    async execute(input: CreateLinkInput): Promise<Result<Link, CreateLinkError>> {
        const parsed = parseInput(input);
        if (!parsed.ok) return parsed;

        const { target, code } = parsed.value;
        const createdAt = this.#deps.clock.now();

        return code
            ? this.#addWithCustomCode(code, target, createdAt)
            : this.#addWithGeneratedCode(target, createdAt);
    }

    async #addWithCustomCode(
        code: ShortCode,
        target: TargetUrl,
        createdAt: Date,
    ): Promise<Result<Link, CreateLinkError>> {
        const link = Link.create({ code, target, createdAt });
        const outcome = await this.#deps.links.add(link);
        return outcome === "added" ? ok(link) : err({ kind: "code_taken", code: code.value });
    }

    async #addWithGeneratedCode(
        target: TargetUrl,
        createdAt: Date,
    ): Promise<Result<Link, CreateLinkError>> {
        for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
            const link = Link.create({ code: this.#deps.codes.generate(), target, createdAt });
            if ((await this.#deps.links.add(link)) === "added") return ok(link);
        }
        throw new Error(
            `Could not generate a free short code after ${String(MAX_GENERATION_ATTEMPTS)} attempts`,
        );
    }
}

interface ParsedInput {
    readonly target: TargetUrl;
    readonly code: ShortCode | undefined;
}

/** Validates every field and reports ALL problems at once, not just the first. */
function parseInput(input: CreateLinkInput): Result<ParsedInput, CreateLinkError> {
    const target = TargetUrl.create(input.url);
    const code = input.code === undefined ? ok(undefined) : ShortCode.create(input.code);

    if (target.ok && code.ok) return ok({ target: target.value, code: code.value });

    const errors: InvalidField[] = [];
    if (!target.ok) errors.push({ field: "url", error: target.error });
    if (!code.ok) errors.push({ field: "code", error: code.error });
    return err({ kind: "invalid_input", errors });
}
