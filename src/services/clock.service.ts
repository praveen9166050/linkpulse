/**
 * The real clock: the only place in the app that reads the current time.
 * Everything else receives a ClockService, so tests can pass one that is
 * frozen at a fixed moment.
 */
export class ClockService {
    now(): Date {
        return new Date();
    }
}
