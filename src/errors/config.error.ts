/**
 * Thrown at startup when the environment configuration is missing or
 * invalid. Lists every problem at once, so they can all be fixed in one go.
 */
export class ConfigError extends Error {
    readonly problems: readonly string[];

    constructor(problems: readonly string[]) {
        super(`Invalid configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
        this.name = "ConfigError";
        this.problems = problems;
    }
}
