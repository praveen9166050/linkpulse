import type { Link } from "../database/entities/link.entity.ts";

/**
 * What clients receive for a link. Matches the `Link` schema in
 * api/openapi.yaml. Kept separate from the `Link` entity so the API's JSON
 * can stay stable while the entity evolves.
 */
export interface LinkResponseDto {
    readonly code: string;
    readonly shortUrl: string;
    readonly url: string;
    readonly createdAt: string;
    readonly expiresAt: string | null;
}

export function toLinkResponseDto(link: Link, publicBaseUrl: string): LinkResponseDto {
    return {
        code: link.code.value,
        shortUrl: `${publicBaseUrl}/${link.code.value}`,
        url: link.target.value,
        createdAt: link.createdAt.toISOString(),
        expiresAt: null, // expiry is not built yet
    };
}
