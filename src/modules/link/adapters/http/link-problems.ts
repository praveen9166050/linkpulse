/**
 * Turns the link module's typed errors into RFC 9457 Problem Details.
 * Every switch is exhaustive: if a new error kind is added to the domain,
 * the build fails until it gets a status code and a message here.
 */
import type { FieldError, Problem } from "../../../../shared/http/problem.ts";
import type { CreateLinkError, InvalidField } from "../../application/create-link.ts";
import type { ShortCodeError } from "../../domain/short-code.ts";
import type { TargetUrlError } from "../../domain/target-url.ts";

export function validationProblem(errors: readonly FieldError[], instance: string): Problem {
    return {
        type: "/problems/validation-error",
        title: "Invalid request",
        status: 400,
        detail: "One or more fields are invalid.",
        instance,
        errors,
    };
}

export function createLinkProblem(error: CreateLinkError, instance: string): Problem {
    switch (error.kind) {
        case "invalid_input":
            return validationProblem(error.errors.map(toFieldError), instance);
        case "code_taken":
            return {
                type: "/problems/code-taken",
                title: "Short code already taken",
                status: 409,
                detail: `The code "${error.code}" is already in use. Choose another.`,
                instance,
            };
    }
}

export function linkNotFoundProblem(code: string, instance: string): Problem {
    return {
        type: "/problems/link-not-found",
        title: "Link not found",
        status: 404,
        detail: `No active link has the code "${code}".`,
        instance,
    };
}

function toFieldError(invalid: InvalidField): FieldError {
    const message =
        invalid.field === "url" ? targetUrlMessage(invalid.error) : shortCodeMessage(invalid.error);
    return { field: invalid.field, kind: invalid.error.kind, message };
}

function shortCodeMessage(error: ShortCodeError): string {
    switch (error.kind) {
        case "too_short":
            return `Must be at least ${String(error.min)} characters long (got ${String(error.actual)}).`;
        case "too_long":
            return `Must be at most ${String(error.max)} characters long (got ${String(error.actual)}).`;
        case "invalid_characters":
            return `Only letters, digits and hyphens are allowed (found ${error.invalid.map((c) => JSON.stringify(c)).join(", ")}).`;
        case "invalid_hyphen_placement":
            return "Hyphens can't be at the start or end, or next to each other.";
        case "reserved":
            return `"${error.word}" is reserved and cannot be used as a short code.`;
    }
}

function targetUrlMessage(error: TargetUrlError): string {
    switch (error.kind) {
        case "too_long":
            return `Must be at most ${String(error.max)} characters long (got ${String(error.actual)}).`;
        case "malformed":
            return "Must be an absolute URL, such as https://example.com/page.";
        case "unsupported_scheme":
            return `Must start with http:// or https:// (got "${error.scheme}:").`;
        case "credentials_not_allowed":
            return "Must not contain a username or password.";
    }
}
