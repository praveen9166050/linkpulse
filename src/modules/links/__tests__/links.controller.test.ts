/**
 * UNIT TEST: LinksController translates between HTTP and the service.
 *
 * Each handler is pulled off the controller and called on its own, exactly
 * as Express calls it after `router.get(path, controller.follow)`. That
 * catches the classic class bug: a method passed as a callback loses `this`.
 */
import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { Link } from "../database/entities/link.entity.ts";
import type { CreateLinkDto } from "../dto/create-link.dto.ts";
import { LinksController } from "../links.controller.ts";
import { ShortCode } from "../short-code.value-object.ts";
import { TargetUrl } from "../target-url.value-object.ts";

const target = TargetUrl.create("https://example.com/articles");
const link = Link.create({
    code: ShortCode.create("abc"),
    target,
    createdAt: new Date("2026-11-13T10:00:00.000Z"),
});

/** What the stand-in service was asked to create, to check what the controller passed. */
const createdFrom: CreateLinkDto[] = [];

/** Stands in for LinksService: the controller needs only these two methods. */
const linksService = {
    createLink: (dto: CreateLinkDto) => {
        createdFrom.push(dto);
        return Promise.resolve(link);
    },
    listLinks: () => Promise.resolve({ links: [link], nextCursor: null }),
    followLink: () => Promise.resolve(target),
};

function controller(): LinksController {
    return new LinksController({ linksService, publicBaseUrl: "https://lnkp.dev" });
}

/** A fake Express response that records what the handler did to it. */
function recordingResponse() {
    const recorded: {
        status?: number;
        headers: Record<string, string>;
        body?: string;
        redirect?: { status: number; url: string };
    } = { headers: {} };

    const res = {
        set(name: string, value: string) {
            recorded.headers[name] = value;
            return this;
        },
        redirect(status: number, url: string) {
            recorded.redirect = { status, url };
        },
        writeHead(status: number, headers: Record<string, string>) {
            recorded.status = status;
            Object.assign(recorded.headers, headers);
            return this;
        },
        end(body: string) {
            recorded.body = body;
            return this;
        },
    };
    return { res: res as unknown as Response, recorded };
}

/** A stand-in request for `follow`: only the route parameter matters. */
function followRequest(code: string): Request<{ code: string }> {
    return { params: { code } } as unknown as Request<{ code: string }>;
}

/** A stand-in request for `create`: the body is already a checked DTO (validateBody ran). */
function createRequest(
    body: CreateLinkDto,
): Request<Record<string, never>, unknown, CreateLinkDto> {
    return { params: {}, body } as unknown as Request<
        Record<string, never>,
        unknown,
        CreateLinkDto
    >;
}

describe("LinksController", () => {
    it("create answers 201 with the link, even when called detached from the controller", async () => {
        const { create } = controller(); // as Express holds it: a plain function
        const { res, recorded } = recordingResponse();

        await create(createRequest({ url: "https://example.com/articles" }), res);

        expect(recorded.status).toBe(201);
        expect(JSON.parse(recorded.body ?? "")).toEqual({
            code: "abc",
            shortUrl: "https://lnkp.dev/abc",
            url: "https://example.com/articles",
            createdAt: "2026-11-13T10:00:00.000Z",
            expiresAt: null,
        });
    });

    it("create passes the body to the service as is: validateBody already parsed it", async () => {
        const { create } = controller();
        const dto: CreateLinkDto = { url: "https://example.com/articles", code: "abc" };

        await create(createRequest(dto), recordingResponse().res);

        expect(createdFrom.at(-1)).toBe(dto); // the SAME object: no second parse in the controller
    });

    it("follow redirects with 302 and no-store, even when called detached", async () => {
        const { follow } = controller();
        const { res, recorded } = recordingResponse();

        await follow(followRequest("abc"), res);

        expect(recorded.redirect).toEqual({ status: 302, url: "https://example.com/articles" });
        expect(recorded.headers["cache-control"]).toBe("no-store");
    });
});
