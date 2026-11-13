/**
 * An in-process EVENT BUS for "a request was handled" (the Observer pattern):
 * the request timer publishes entries; the live stream subscribes. Neither
 * knows about the other, so more subscribers (a metrics counter, say) can
 * be added without touching the publisher.
 *
 * Keeps the most recent entries in a small RING BUFFER (fixed size; the
 * oldest falls out), so a dashboard that connects late still sees history,
 * and memory stays bounded however long the server runs.
 *
 * In-process only: with several API instances, each has its own log. A
 * shared bus (Redis pub/sub, Kafka) comes with the event-driven phase.
 */

export interface RequestLogEntry {
    /** Increasing number; also the SSE event id. */
    readonly id: number;
    /** When the response finished, ISO 8601. */
    readonly at: string;
    readonly method: string;
    /** The path, without the query string. */
    readonly path: string;
    readonly status: number;
    readonly durationMs: number;
}

export type RequestLogListener = (entry: RequestLogEntry) => void;

const DEFAULT_CAPACITY = 50;

export class RequestLogService {
    readonly #capacity: number;
    readonly #recent: RequestLogEntry[] = [];
    readonly #listeners = new Set<RequestLogListener>();
    #nextId = 1;

    constructor(options: { readonly capacity?: number } = {}) {
        this.#capacity = options.capacity ?? DEFAULT_CAPACITY;
    }

    /** Adds an entry and tells every subscriber. */
    record(entry: Omit<RequestLogEntry, "id">): RequestLogEntry {
        const recorded = { id: this.#nextId++, ...entry };

        this.#recent.push(recorded);
        if (this.#recent.length > this.#capacity) this.#recent.shift();

        for (const listener of this.#listeners) {
            try {
                listener(recorded);
            } catch {
                // One broken subscriber must not stop the others, or the request.
            }
        }
        return recorded;
    }

    /** The most recent entries, oldest first. */
    recent(): readonly RequestLogEntry[] {
        return [...this.#recent];
    }

    /** Calls `listener` for every new entry. Returns the function that stops it. */
    subscribe(listener: RequestLogListener): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }

    get subscriberCount(): number {
        return this.#listeners.size;
    }
}
