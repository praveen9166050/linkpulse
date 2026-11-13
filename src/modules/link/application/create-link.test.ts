import { beforeEach, describe, expect, it } from "vitest";
import { FixedClock, SequenceCodeGenerator } from "../../../../test/support/link-fakes.ts";
import { unwrap, unwrapError } from "../../../../test/support/result.ts";
import { InMemoryLinkRepository } from "../adapters/in-memory/in-memory-link-repository.ts";
import { Link } from "../domain/link.ts";
import { ShortCode } from "../domain/short-code.ts";
import { TargetUrl } from "../domain/target-url.ts";
import { CreateLink } from "./create-link.ts";

const NOW = new Date("2026-11-13T10:00:00Z");

describe("CreateLink", () => {
    let links: InMemoryLinkRepository;
    const clock = new FixedClock(NOW);

    beforeEach(() => {
        links = new InMemoryLinkRepository();
    });

    function createLink(codes: readonly string[] = ["aZ3kP9q"]): CreateLink {
        return new CreateLink({ links, codes: new SequenceCodeGenerator(codes), clock });
    }

    async function storedTarget(code: string): Promise<string | undefined> {
        const link = await links.findByCode(unwrap(ShortCode.create(code)));
        return link?.target.value;
    }

    it("creates a link with a generated code, stamped with the current time", async () => {
        const link = unwrap(
            await createLink(["aZ3kP9q"]).execute({ url: "https://Example.com/a" }),
        );

        expect(link.code.value).toBe("aZ3kP9q");
        expect(link.target.value).toBe("https://example.com/a"); // normalised
        expect(link.createdAt).toEqual(NOW);
        expect(await storedTarget("aZ3kP9q")).toBe("https://example.com/a");
    });

    it("uses the custom code when one is given, without generating one", async () => {
        const codes = new SequenceCodeGenerator([]);
        const useCase = new CreateLink({ links, codes, clock });

        const link = unwrap(
            await useCase.execute({ url: "https://example.com/cv.pdf", code: "my-resume" }),
        );

        expect(link.code.value).toBe("my-resume");
        expect(codes.calls).toBe(0);
    });

    it("rejects a custom code that is already taken, leaving the existing link alone", async () => {
        await links.add(
            Link.create({
                code: unwrap(ShortCode.create("my-resume")),
                target: unwrap(TargetUrl.create("https://first.example/")),
                createdAt: NOW,
            }),
        );

        const error = unwrapError(
            await createLink().execute({ url: "https://second.example/", code: "my-resume" }),
        );

        expect(error).toEqual({ kind: "code_taken", code: "my-resume" });
        expect(await storedTarget("my-resume")).toBe("https://first.example/");
    });

    it("tries the next generated code when one collides", async () => {
        await createLink(["aaaaaaa"]).execute({ url: "https://first.example/" });

        const link = unwrap(
            await createLink(["aaaaaaa", "bbbbbbb"]).execute({ url: "https://second.example/" }),
        );

        expect(link.code.value).toBe("bbbbbbb");
        expect(await storedTarget("aaaaaaa")).toBe("https://first.example/");
    });

    it("gives up after 5 colliding generated codes, as that signals a bug, not bad input", async () => {
        await createLink(["aaaaaaa"]).execute({ url: "https://first.example/" });
        const collisions = Array.from({ length: 5 }, () => "aaaaaaa");

        await expect(
            createLink(collisions).execute({ url: "https://second.example/" }),
        ).rejects.toThrow(/after 5 attempts/);
    });

    it("rejects an invalid URL without saving anything", async () => {
        const error = unwrapError(await createLink().execute({ url: "javascript:alert(1)" }));

        expect(error).toEqual({
            kind: "invalid_input",
            errors: [{ field: "url", error: { kind: "unsupported_scheme", scheme: "javascript" } }],
        });
        expect(await storedTarget("aZ3kP9q")).toBeUndefined(); // the code it would have used
    });

    it("reports every invalid field at once, not just the first", async () => {
        const error = unwrapError(await createLink().execute({ url: "not a url", code: "api" }));

        expect(error).toEqual({
            kind: "invalid_input",
            errors: [
                { field: "url", error: { kind: "malformed" } },
                { field: "code", error: { kind: "reserved", word: "api" } },
            ],
        });
    });
});
