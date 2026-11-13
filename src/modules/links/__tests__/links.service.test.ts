import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BadRequestError } from "#src/errors/response-errors/bad-request.error.ts";
import { ConflictError } from "#src/errors/response-errors/conflict.error.ts";
import { NotFoundError } from "#src/errors/response-errors/not-found.error.ts";
import { connectTestDatabase, type TestDatabase } from "#test/shared/test-database.ts";
import { fixedClock, scriptedRandom } from "#test/shared/test-doubles.ts";
import { rejectionOf } from "#test/shared/thrown.ts";
import { LinkRepository } from "../database/repositories/link.repository.ts";
import { LinksService } from "../links.service.ts";
import { ShortCodeGeneratorService } from "../short-code-generator.service.ts";
import { ShortCode } from "../short-code.value-object.ts";

const NOW = new Date("2026-11-13T10:00:00Z");

describe("LinksService", () => {
    let database: TestDatabase;
    let linkRepository: LinkRepository;

    beforeAll(async () => {
        database = await connectTestDatabase();
        linkRepository = new LinkRepository(database.connection, {
            collection: database.linksCollection,
        });
    });

    beforeEach(async () => {
        await database.clear();
    });

    afterAll(async () => {
        await database.dispose();
    });

    /** A service whose generator will produce exactly `codes`, in order (none by default). */
    function service(...codes: string[]): LinksService {
        return new LinksService({
            linkRepository,
            shortCodeGenerator: new ShortCodeGeneratorService({
                randomIndex: scriptedRandom(...codes),
            }),
            clock: fixedClock(NOW),
        });
    }

    async function storedTarget(code: string): Promise<string | undefined> {
        return (await linkRepository.findByCode(ShortCode.create(code)))?.target.value;
    }

    describe("createLink", () => {
        it("creates a link with a generated code, stamped with the current time", async () => {
            const link = await service("aZ3kP9q").createLink({ url: "https://Example.com/a" });

            expect(link.code.value).toBe("aZ3kP9q");
            expect(link.target.value).toBe("https://example.com/a"); // normalised
            expect(link.createdAt).toEqual(NOW);
            expect(await storedTarget("aZ3kP9q")).toBe("https://example.com/a");
        });

        it("uses the custom code when one is given, without generating one", async () => {
            // No scripted codes: generating one would throw and fail the test.
            const link = await service().createLink({
                url: "https://example.com/cv.pdf",
                code: "my-resume",
            });

            expect(link.code.value).toBe("my-resume");
        });

        it("rejects a custom code that is already taken, leaving the existing link alone", async () => {
            await service().createLink({ url: "https://first.example/", code: "my-resume" });

            const error = await rejectionOf(
                service().createLink({ url: "https://second.example/", code: "my-resume" }),
            );

            expect(error).toBeInstanceOf(ConflictError);
            expect(error).toMatchObject({ status: 409, type: "/problems/code-taken" });
            expect(await storedTarget("my-resume")).toBe("https://first.example/");
        });

        it("tries the next generated code when one collides", async () => {
            await service("aaaaaaa").createLink({ url: "https://first.example/" });

            const link = await service("aaaaaaa", "bbbbbbb").createLink({
                url: "https://second.example/",
            });

            expect(link.code.value).toBe("bbbbbbb");
            expect(await storedTarget("aaaaaaa")).toBe("https://first.example/");
        });

        it("gives up after 5 colliding generated codes, as that signals a bug, not bad input", async () => {
            await service("aaaaaaa").createLink({ url: "https://first.example/" });
            const collisions = Array.from({ length: 5 }, () => "aaaaaaa");

            const error = await rejectionOf(
                service(...collisions).createLink({ url: "https://second.example/" }),
            );

            expect(error).not.toBeInstanceOf(BadRequestError); // a plain Error: becomes a 500
            expect(error).toHaveProperty("message", expect.stringMatching(/after 5 attempts/));
        });

        it("rejects an invalid URL without saving anything", async () => {
            const error = await rejectionOf(
                service("aZ3kP9q").createLink({ url: "javascript:alert(1)" }),
            );

            expect(error).toBeInstanceOf(BadRequestError);
            expect(error).toHaveProperty("errors", [
                {
                    field: "url",
                    kind: "unsupported_scheme",
                    message: 'Must start with http:// or https:// (got "javascript:").',
                },
            ]);
            expect(await storedTarget("aZ3kP9q")).toBeUndefined();
        });

        it("reports every invalid field at once, not just the first", async () => {
            const error = await rejectionOf(
                service().createLink({ url: "not a url", code: "api" }),
            );

            expect(error).toHaveProperty("errors", [
                {
                    field: "url",
                    kind: "malformed",
                    message: "Must be an absolute URL, such as https://example.com/page.",
                },
                {
                    field: "code",
                    kind: "reserved",
                    message: '"api" is reserved and cannot be used as a short code.',
                },
            ]);
        });
    });

    describe("followLink", () => {
        beforeEach(async () => {
            await service().createLink({ url: "https://example.com/a", code: "aZ3kP9q" });
        });

        it("returns the target of an existing link", async () => {
            expect((await service().followLink("aZ3kP9q")).value).toBe("https://example.com/a");
        });

        it.each([
            ["an unknown code", "zzzzzzz"],
            ["the same code in other case (codes are case-sensitive)", "AZ3KP9Q"],
            ["a string that can never be a valid code", "a_b"],
            ["a reserved word", "api"],
        ])("throws NotFoundError for %s", async (_description, code) => {
            const error = await rejectionOf(service().followLink(code));

            expect(error).toBeInstanceOf(NotFoundError);
            expect(error).toMatchObject({ status: 404, type: "/problems/link-not-found" });
        });
    });
});
