# 0003. Redirect short links with 302, not 301

- **Status:** Accepted
- **Date:** 2026-11-13

## Context

Following a short link (`GET /{code}`) answers with an HTTP redirect to the
target URL. The learning plan first said 301. LinkPulse's core features
include click analytics (Phase 4 on): total and unique clicks, clicks over
time, country and device breakdowns. Every click must reach the server to be
counted.

## Options considered

1. **301 Moved Permanently.** Tells clients the move is permanent. Browsers
   cache it with no expiry: after the first visit, the browser jumps
   straight to the target without asking the server, so repeat clicks are
   invisible. A link whose target is later edited keeps sending cached
   visitors to the old target. Slightly better for SEO "link equity".
2. **302 Found.** A temporary redirect: clients ask the server every time.
   Every click is counted, and editing a link's target takes effect at once.
3. **307 Temporary Redirect.** Like 302 but guarantees the HTTP method is
   kept (a POST stays a POST). Redirects here are always GET, so it adds
   nothing over 302, which every client handles identically for GET.

## Decision

302 Found, with `Cache-Control: no-store` so proxies and CDNs do not cache
the redirect either.

## Consequences

- Every click reaches LinkPulse, so analytics are complete and edits apply
  immediately.
- Every click costs a request to our service, so the redirect path must be
  fast; caching moves to our side (Redis, Phase 5) instead of the browser.
- Revisit if a customer needs SEO-preserving permanent redirects; that could
  become a per-link option.
