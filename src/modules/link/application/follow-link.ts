import { err, ok, type Result } from "../../../shared/result.ts";
import { ShortCode } from "../domain/short-code.ts";
import type { TargetUrl } from "../domain/target-url.ts";
import type { LinkRepository } from "./ports.ts";

export type FollowLinkError = { readonly kind: "not_found" };

export interface FollowLinkDependencies {
    readonly links: LinkRepository;
}

/**
 * USE CASE: find where a short link points.
 *
 * A string that can't be a valid code is simply not found: no link can
 * have it, so there is no need to ask the repository.
 */
export class FollowLink {
    readonly #deps: FollowLinkDependencies;

    constructor(deps: FollowLinkDependencies) {
        this.#deps = deps;
    }

    async execute(rawCode: string): Promise<Result<TargetUrl, FollowLinkError>> {
        const code = ShortCode.create(rawCode);
        if (!code.ok) return err({ kind: "not_found" });

        const link = await this.#deps.links.findByCode(code.value);
        return link ? ok(link.target) : err({ kind: "not_found" });
    }
}
