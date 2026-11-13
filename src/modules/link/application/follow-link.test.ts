import { describe, expect, it } from "vitest";
import { unwrap, unwrapError } from "../../../../test/support/result.ts";
import { InMemoryLinkRepository } from "../adapters/in-memory/in-memory-link-repository.ts";
import { Link } from "../domain/link.ts";
import { ShortCode } from "../domain/short-code.ts";
import { TargetUrl } from "../domain/target-url.ts";
import { FollowLink } from "./follow-link.ts";

async function repositoryWith(code: string, target: string): Promise<InMemoryLinkRepository> {
    const links = new InMemoryLinkRepository();
    await links.add(
        Link.create({
            code: unwrap(ShortCode.create(code)),
            target: unwrap(TargetUrl.create(target)),
            createdAt: new Date("2026-11-13T10:00:00Z"),
        }),
    );
    return links;
}

describe("FollowLink", () => {
    it("returns the target of an existing link", async () => {
        const links = await repositoryWith("aZ3kP9q", "https://example.com/a");

        const target = unwrap(await new FollowLink({ links }).execute("aZ3kP9q"));

        expect(target.value).toBe("https://example.com/a");
    });

    it("reports not_found for an unknown code", async () => {
        const links = await repositoryWith("aZ3kP9q", "https://example.com/a");

        expect(unwrapError(await new FollowLink({ links }).execute("zzzzzzz"))).toEqual({
            kind: "not_found",
        });
    });

    it("is case-sensitive, like short codes", async () => {
        const links = await repositoryWith("aZ3kP9q", "https://example.com/a");

        expect(unwrapError(await new FollowLink({ links }).execute("AZ3KP9Q"))).toEqual({
            kind: "not_found",
        });
    });

    it.each(["a_b", "x", "api"])(
        "reports not_found for %j, which can never be a valid code",
        async (raw) => {
            const links = new InMemoryLinkRepository();

            expect(unwrapError(await new FollowLink({ links }).execute(raw))).toEqual({
                kind: "not_found",
            });
        },
    );
});
