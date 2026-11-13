import { randomInt } from "node:crypto";
import { InvalidShortCodeError } from "#src/errors/invalid-short-code.error.ts";
import { ShortCode } from "./short-code.value-object.ts";

/** Digits, upper case, lower case: 62 characters, all safe in a URL path. */
export const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 62^7 ≈ 3.5 trillion possible codes. */
const CODE_LENGTH = 7;

/**
 * A random code can still spell a reserved word ("billing" is 7 letters),
 * which ShortCode rejects; then we simply draw again. Needing this many
 * draws means the alphabet or rules are broken: a bug, so we throw.
 */
const MAX_DRAWS = 10;

export interface ShortCodeGeneratorOptions {
    /**
     * Returns a uniformly random integer in [0, max). Defaults to
     * `crypto.randomInt`; tests pass a scripted one.
     */
    readonly randomIndex?: (max: number) => number;
}

/**
 * Generates random 7-character base62 short codes.
 *
 * Uses `crypto.randomInt`, not `Math.random()`: Math.random is not
 * cryptographically secure, so its future output can be predicted from
 * past codes, letting someone guess other people's links. randomInt also
 * avoids MODULO BIAS: `randomByte % 62` would make the first 8 characters
 * more likely, because 256 is not a multiple of 62.
 */
export class ShortCodeGeneratorService {
    readonly #randomIndex: (max: number) => number;

    constructor(options: ShortCodeGeneratorOptions = {}) {
        this.#randomIndex = options.randomIndex ?? ((max) => randomInt(max));
    }

    generate(): ShortCode {
        for (let draw = 1; draw <= MAX_DRAWS; draw++) {
            try {
                return ShortCode.create(this.#randomString());
            } catch (error) {
                if (!(error instanceof InvalidShortCodeError)) throw error;
            }
        }
        throw new Error(`No valid short code after ${String(MAX_DRAWS)} draws`);
    }

    #randomString(): string {
        let result = "";
        for (let i = 0; i < CODE_LENGTH; i++) {
            result += BASE62_ALPHABET.charAt(this.#randomIndex(BASE62_ALPHABET.length));
        }
        return result;
    }
}
