/**
 * ADAPTER: the real clock. The only place in the app that reads the
 * current time; everything else receives it through a `Clock` port, so
 * tests can use a fixed clock instead.
 *
 * It matches every module's `Clock` port by shape (TypeScript compares
 * structure, not names), so no module needs to import it.
 */
export class SystemClock {
    now(): Date {
        return new Date();
    }
}
