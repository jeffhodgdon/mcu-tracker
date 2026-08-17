# MCU Tracker

A public, multi-user Marvel Cinematic Universe watch tracker, running on
Cloudflare Workers with D1 for storage.

**Status: Phase 2 — schema, auth and API.** The database schema, email/password
authentication and the tracker's JSON API are in place, and the catalogue is
seeded from `seed-data.csv`. There is no UI yet — anything outside `/api/`
returns a plain-text health response.

Phase 2 is applied to **dev only**. Production still has an empty database and
is running the Phase 1 scaffold; see [Promoting to production](#promoting-to-production).

## Stack

- **Cloudflare Workers** — plain JavaScript ES modules, no build step. Wrangler
  bundles `src/worker.js` directly. (Switching to TypeScript later is a one-line
  change: rename to `src/worker.ts` and update `main` in `wrangler.toml`;
  Wrangler compiles TS natively.)
- **Cloudflare D1** — SQLite at the edge. One database per environment.
- **Wrangler 4** — pinned as a devDependency so every machine and CI runner uses
  the same version.

## Environments

Each environment has its own subdomain on the `kjserver.dev` zone, attached as a
Workers Custom Domain, so Cloudflare manages the DNS record for each.

| | dev | production |
|---|---|---|
| Worker name | `mcu-tracker-dev` | `mcu-tracker` |
| Hostname | `mcu-dev.kjserver.dev` | `mcu.kjserver.dev` |
| D1 database | `mcu-tracker-dev` | `mcu-tracker-prod` |
| D1 binding | `env.DB` | `env.DB` |
| `env.ENVIRONMENT` | `"dev"` | `"production"` |

The binding name is `DB` in both environments, so application code never branches
on environment to reach the database.

### Subdomain routing via Custom Domains

Each environment is attached to its own subdomain as a Cloudflare **Workers
Custom Domain** (`custom_domain = true` in `wrangler.toml`), matching how
`physics.kjserver.dev` is configured on this zone:

```toml
routes = [{ pattern = "mcu.kjserver.dev", custom_domain = true }]
```

Two consequences worth knowing:

- **DNS is managed for you.** Cloudflare creates the proxied DNS record and
  issues the edge certificate on first deploy. There is no manual dashboard
  step, and the record should not be hand-edited — deleting it breaks the
  custom domain binding.
- **The Worker owns the entire hostname.** Every path is routed to the Worker,
  so paths are relative to root: `/`, `/watchlist`, `/api/...`. There is no
  route prefix to strip, and none of the trailing-slash matching quirks that
  path-based routes (`kjserver.dev/mcu/*`) have.

The custom-domain pattern is the bare hostname — no `/*` suffix and no
`zone_name`, both of which apply only to path-based routes.

## Database

The schema lives in `migrations/`, applied with Wrangler's migration tracker so
each database records what it has already run.

```bash
npx wrangler d1 migrations list  mcu-tracker-dev --env dev --remote
npx wrangler d1 migrations apply mcu-tracker-dev --env dev --remote
```

Tables: `users`, `sessions`, `items`, `watch_status`, `user_settings`,
`feedback`.

`0001` is the whole schema. From here on, migrations are append-only — never
edit one that has been applied, add a new numbered file instead. `0001` itself
was collapsed from an earlier two-file history before any of this reached
production, and dev's tracking table was reconciled by hand to match.

### Runtime provenance

An earlier revision had an `items.runtime_source` column recording where each
runtime figure came from, and some values named personal media-server tooling.
That is not something a public application should store, so it was removed
everywhere: the column is gone from the schema, the CSV, the seed output and
the `/api/items` response, and the git history was squashed so no trace of the
original values remains.

The seed generator **refuses to run** if a `Runtime Source` column reappears in
`seed-data.csv`, so it cannot be reintroduced by accident.

### Seeding the catalogue

`seed-data.csv` is the reviewed master export. It is converted to SQL by a
generator rather than loaded directly, so what reaches the database is
reviewable in the diff:

```bash
node scripts/generate-seed.mjs                                          # -> seed/items.sql
npx wrangler d1 execute mcu-tracker-dev --env dev --remote --file seed/items.sql
```

The generator makes three decisions worth knowing about:

- **`is_estimate`** comes from the id list in `seed/estimate-ids.json`, since
  the column it was once derived from no longer exists (see
  [Runtime provenance](#runtime-provenance)). The flag is a plain boolean and
  leaks nothing, so it is carried as ids only. To change which items are
  flagged, edit that file and re-run the generator.
- **Item ids come from the CSV's `#` column**, not autoincrement, so re-seeding
  upserts in place and never renumbers. This matters because `watch_status.item_id`
  points at these ids — if the spreadsheet is ever *renumbered*, existing users'
  watch history would silently attach to the wrong titles. Re-check this before
  seeding production a second time.
- **Release dates** are stored as-is when they are real dates, kept verbatim when
  they are partial placeholders like `2027-07-00` (year/month known, day not
  announced), and `NULL` when the CSV says `TBD`. Partial values sort correctly
  as text, which preserves timeline order, but SQLite's `date()` returns NULL for
  them — **order by the raw `release_date` string, not by `date(release_date)`**.

## API

All endpoints return JSON. Session state is a `mcu_session` cookie
(`HttpOnly; Secure; SameSite=Lax`), created on signup and login.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/signup` | – | Create account, start a session |
| POST | `/api/login` | – | Start a session |
| POST | `/api/logout` | – | Delete session, clear cookie |
| GET | `/api/items` | – | Full catalogue, ordered by curated id |
| GET | `/api/watch-status` | ✓ | Caller's status for every tracked item |
| PUT | `/api/watch-status/:item_id` | ✓ | Set `status` and/or `episode_progress` |
| GET | `/api/settings` | ✓ | Countdown target date and label |
| PUT | `/api/settings` | ✓ | Update countdown target date and label |

`/api/items` is deliberately public: the catalogue is not user data, and the
Phase 3 UI needs it to render before anyone logs in. Everything user-scoped
returns `401` without a valid session.

`status` must be one of `unwatched`, `watched`, `want_rewatch`, `skip`. A `PUT`
that sends only one of `status` / `episode_progress` leaves the other untouched.

### Security notes

- Passwords are hashed with **PBKDF2-SHA256, 100,000 iterations**, a random
  16-byte salt per password, compared in constant time. The iteration count and
  salt are stored inside the hash string (`pbkdf2-sha256$<iters>$<salt>$<hash>`),
  and verification always uses the parameters recorded with the hash it is
  checking — so `PBKDF2_ITERATIONS` in `src/auth.js` can be changed at any time
  without invalidating existing passwords.

  **This account is on the Workers Free plan, which caps CPU at 10 ms per
  request.** Measured on workerd, PBKDF2 costs roughly 4.6 ms at 50k
  iterations, 8.3 ms at 100k, and 17.8 ms at 210k. The current 100k setting
  therefore leaves under 2 ms of headroom for the rest of the request and is
  expected to be marginal — raising it requires the paid plan, and 50k is the
  safe setting if staying on free. See the table in `src/auth.js`.
- Login returns the same response for an unknown email as for a wrong password,
  so it cannot be used to enumerate accounts. Signup necessarily reveals that an
  address is taken.
- Session expiry is enforced in SQL (`expires_at > datetime('now')`), so a stale
  row can never authenticate even if the cookie is replayed.
- Rate limiting on signup/login is **10 attempts per IP per 10 minutes**, held
  **in memory**. That state is per Worker isolate and resets when an isolate is
  recycled, so it slows casual brute force but is not a hard boundary. Moving it
  to KV or a Durable Object would make it global.

## Promoting to production

Nothing in Phase 2 has been applied to production. When you are ready:

```bash
npx wrangler d1 migrations apply mcu-tracker-prod --env production --remote
npx wrangler d1 execute mcu-tracker-prod --env production --remote --file seed/items.sql
npm run deploy:prod
```

## Local development

```bash
npm install
npm run dev          # wrangler dev --env dev, local D1 simulation
```

Local mode uses a simulated D1 in `.wrangler/state`, not the real database. To
work against the real remote dev database instead, add `"remote": true` to the
D1 binding and run `wrangler dev` normally.

Note that `wrangler dev --remote` does **not** work on this project: it serves
the preview through `kjserver.dev`, which is behind Cloudflare Access, and the
CLI cannot complete the Access login non-interactively. Use a remote binding as
above, which runs the Worker locally and reaches past Access entirely.

## Deploying

```bash
npm run deploy:dev    # wrangler deploy --env dev
npm run deploy:prod   # wrangler deploy --env production
```

Validate a config change without shipping it:

```bash
npx wrangler deploy --env production --dry-run
```

> **Always pass `--env`.** A bare `wrangler deploy` targets the top-level config,
> whose Worker name is also `mcu-tracker` — it would overwrite production with a
> version that has **no routes and no D1 binding**. The npm scripts above always
> pass `--env`; prefer them over raw `wrangler deploy`.

## Querying D1

```bash
npm run d1:dev  -- --command "SELECT 1"
npm run d1:prod -- --command "SELECT 1"
```

Both scripts target `--remote` (the real database). Drop `--remote` and add
`--local` to hit the local simulation instead.

## Logs

```bash
npm run tail:dev
npm run tail:prod
```

Observability is enabled in `wrangler.toml`, so invocation logs are also
retained and searchable in the Cloudflare dashboard.

## Cloudflare Access

The `kjserver.dev` zone sits behind Cloudflare Access, so both subdomains
currently return a `302` to the Access login page for unauthenticated requests.
That is the Access layer in front of the Worker, not a Worker error — a browser
session that is already logged in to Access reaches the Worker normally.

Because this app is intended to be **public and multi-user**, a future phase will
need an Access bypass policy (or removal of `mcu.kjserver.dev` from the covering
Access application) before real users can reach it. Note that `ntfy.kjserver.dev`
on this same zone is already publicly reachable, so per-hostname carve-outs are
clearly workable here.

## Secrets

Never commit secrets. Use `.dev.vars` for local values (gitignored) and
`wrangler secret put <NAME> --env <ENV>` for deployed environments.

## Project layout

```
src/worker.js              Entrypoint: routing, health response
src/auth.js                Password hashing, sessions, cookies
src/api.js                 Endpoint handlers
src/ratelimit.js           In-memory auth rate limiter
migrations/                Schema, applied via wrangler d1 migrations
scripts/generate-seed.mjs  seed-data.csv -> seed/items.sql
seed/items.sql             Generated; do not edit by hand
seed/estimate-ids.json     Ids whose runtime is an estimate
seed-data.csv              Reviewed master export (source of truth)
wrangler.toml              Worker + environment + D1 configuration
```
