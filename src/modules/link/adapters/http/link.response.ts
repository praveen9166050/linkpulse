import type { Link } from "../../domain/link.ts";

/**
 * RESPONSE DTO: what clients receive for a link. Matches the `Link`
 * schema in api/openapi.yaml. Keeping it separate from the domain `Link`
 * means the API's JSON can stay stable while the domain evolves.
 */
export interface LinkResponse {
    readonly code: string;
    readonly shortUrl: string;
    readonly url: string;
    readonly createdAt: string;
    readonly expiresAt: string | null;
}

export function toLinkResponse(link: Link, publicBaseUrl: string): LinkResponse {
    return {
        code: link.code.value,
        shortUrl: `${publicBaseUrl}/${link.code.value}`,
        url: link.target.value,
        createdAt: link.createdAt.toISOString(),
        expiresAt: null, // expiry is not built yet
    };
}
