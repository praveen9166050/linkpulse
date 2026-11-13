import type { Link } from "../database/entities/link.entity.ts";
import { type LinkResponseDto, toLinkResponseDto } from "./link-response.dto.ts";

/** One page of GET /api/v1/links. Matches `LinkPage` in api/openapi.yaml. */
export interface LinkPageResponseDto {
    readonly items: readonly LinkResponseDto[];
    /** Pass back as `cursor` for the next page; null on the last page. */
    readonly nextCursor: string | null;
}

export function toLinkPageResponseDto(
    page: { readonly links: readonly Link[]; readonly nextCursor: string | null },
    publicBaseUrl: string,
): LinkPageResponseDto {
    return {
        items: page.links.map((link) => toLinkResponseDto(link, publicBaseUrl)),
        nextCursor: page.nextCursor,
    };
}
