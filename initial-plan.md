# Rocket Lab Pickleball League — Build Plan

## Context

The league is currently tracked on scheduler.leaguelobster.com. The goal is a self-hosted
website for the **Rocket Lab Pickleball League** that:

- Auto-generates a multi-week schedule from a list of teams (round-robin to start).
- Shows each week's matchups.
- Lets **anyone on the office network** submit match scores (no login).
- Gates all editing (teams, schedule, score overrides, playoffs) behind a **single admin password**.
- Tracks each team's record (match wins) and computes regular-season seeding.
- Auto-generates a single-elimination **playoff bracket** from the final seeding.
- Uses a **dark theme** with Rocket Lab **black + red** branding.

Confirmed constraints (from clarifying Q&A):
- **Internal-network only** — no public internet. Developed in WSL; deployed as a Docker container to an internal company server via GitLab CI/CD. Still $0 (existing company infra + tooling).
- **Open score entry**; one shared admin password (low-security is fine, trusted network).
- **Round-robin now**, but built to allow other strategies later (seeded, ladder).
  Arbitrary week count is valid (e.g. 12 teams over 6 weeks = first 6 rounds of the rotation).
- **Match score = two integers** (e.g. best-of-3 recorded as `2`–`1`). Best-of-N flexible,
  just number inputs, no fancy validation. Winner = higher number.

## Tech Stack (recommended)

- **Next.js (App Router) + TypeScript** — pages + server-side mutations in one process; builds to a single container image (`output: 'standalone'`).
- **Tailwind CSS** — fast theming; dark/red tokens via CSS variables.
- **Prisma + SQLite** — single-file DB on a persistent Docker volume; type-safe, trivial to back up. **Swappable to Postgres** by changing the Prisma datasource + connection string if the server prefers it.
- **Server Actions** for mutations (forms), **Server Components** for data display.
- **Vitest** for a handful of scheduler/standings/bracket unit tests (the algorithm logic deserves tests; UI does not).
- **Docker + GitLab CI/CD** — CI builds the image, pushes to the GitLab Container Registry, and deploys to the internal server.

Rationale: internal-network + single admin + SQLite-on-a-volume keeps it simple — no OAuth, no managed DB required. Migrations run via `prisma migrate deploy` on container start.

## Data Model (Prisma / SQLite)

- **Season** — `id, name, numWeeks, scheduleType (enum: ROUND_ROBIN), playoffTeamCount, status (SETUP|REGULAR|PLAYOFFS|COMPLETE), isActive`. One active season; model supports future seasons.
- **Team** — `id, seasonId, name, color?, createdAt`.
- **Match** — `id, seasonId, week (int), homeTeamId, awayTeamId, homeScore (int?), awayScore (int?), status (SCHEDULED|COMPLETE)`. A bye = a match with one team null (that team sits out / auto-win or no-result, configurable; default: no result, doesn't count).
- **PlayoffMatch** — `id, seasonId, round (int), slot (int), team1Id?, team2Id?, score1?, score2?, nextMatchId?, nextSlot?`. Winner auto-advances into `nextMatchId`/`nextSlot`. Seeds can be null until a feeding match completes.
- **Standings are computed, not stored** — derived from completed `Match` rows on read.

Admin password lives in **`.env` (`ADMIN_PASSWORD`)**, not the DB.

## Core Logic Modules (`src/lib/`)

### `scheduler/` — pluggable strategy
- `interface ScheduleStrategy { generate(teams: Team[], weeks: number): WeekPlan[] }` where `WeekPlan = { week, matchups: {home, away|null}[] }`.
- `RoundRobinStrategy` (circle method): pin one team, rotate the rest; produces `N-1` unique rounds, `N/2` matches each. Odd N → add a bye placeholder (one team sits out per round). For `weeks > N-1`, cycle the rotation (optionally swap home/away on repeats). For `weeks < N-1`, take the first `weeks` rounds.
  - Satisfies "12 teams / 6 weeks" → 6 rounds, 6 matches/week, each team plays once/week.
- One match per team per week (MVP). "Multiple games/week" noted as a future extension.
- Future strategies (`SeededStrategy`, `LadderStrategy`) slot in behind the same interface.

### `standings.ts`
- From completed matches compute per team: `matchesPlayed, wins, losses, gamesFor (Σ own score), gamesAgainst, gamesDiff`.
- Seed order (tiebreakers): **1) wins desc, 2) gamesDiff desc, 3) gamesFor desc, 4) head-to-head, 5) name**. Returns ranked list with seed numbers.

### `playoffs.ts`
- Input: ranked standings + `playoffTeamCount` (**admin-set in the UI: any number from a small bracket up to ALL teams**).
- Standard single-elim seeding (1 vs N, 2 vs N-1, …). Non-power-of-2 → top seeds get first-round byes (e.g. 6 teams: seeds 1–2 bye, 3v6, 4v5; all 12 teams: seeds 1–4 bye into a 16-slot bracket).
- Build the bracket as linked `PlayoffMatch` rows; entering a score advances the winner to `nextMatchId`. Regenerating clears the old bracket.

### `auth.ts`
- `ADMIN_PASSWORD` from env. Login posts the password → on match, set a signed httpOnly cookie (simple HMAC of a constant, good enough for a trusted LAN). `requireAdmin()` guards admin server actions/pages; redirects to `/admin/login` otherwise.

## Pages / UI (`src/app/`)

- **`/` Standings (home)** — ranked table (seed, team, W–L, games diff), Rocket Lab branding/header.
- **`/schedule`** — week selector; each match shown as a card with two number inputs + Save (open to everyone). Completed matches show the score and winner highlighted.
- **`/playoffs`** — visual single-elimination bracket; score entry per match (open); winners auto-advance.
- **`/admin/login`** — password form.
- **`/admin`** — dashboard (password-gated): manage teams (add/edit/remove), season config (name, # weeks, schedule type, **playoff team count — any value up to all teams**), **Generate/Regenerate schedule**, edit/override any score, **Generate playoff bracket**, set league phase.
- Shared **Nav** + **laptop-first** layout (full-width tables, horizontal bracket, multi-column admin); degrades gracefully on narrow screens.

## Visual Design — "Mission Control" (chosen)

Aerospace/telemetry feel that reads as Rocket Lab:
- **Type:** uppercase section labels with wide letter-spacing; clean sans (Inter) for UI; **monospace** (e.g. JetBrains Mono) for all stats/seeds/scores so columns align like a readout.
- **Shape:** sharp/near-square corners, thin grid rules between rows, minimal fills.
- **Color tokens** in `globals.css`: `--bg #0a0a0a`, `--surface #141414`, `--border #262626`, `--text #f5f5f5`, `--muted #8a8a8a`, `--accent #E4002B` (Rocket Lab red — swap to exact brand hex if you have it), `--accent-dim`.
- **Red is a signal only:** primary actions, the winning team, the playoff cut line, the active week. Everything else stays near-black/white/gray.
- **Logo:** custom **SVG "Rocket-ball" mark** — a rocket whose body is a pickleball (perforated holes) with a red exhaust flame; locked up beside "ROCKET LAB PICKLEBALL LEAGUE" in the header.
- **Laptop/desktop-first:** optimized for wide screens (full-width tables, horizontal bracket, multi-column admin). Stays usable on phones as a graceful fallback, but desktop is the primary target.

## Project Structure

```
pickleball/
  prisma/            schema.prisma, seed.ts
  src/
    app/             layout.tsx, globals.css, page.tsx (standings),
                     schedule/page.tsx, playoffs/page.tsx,
                     admin/login/page.tsx, admin/page.tsx, admin/teams/*
    lib/             db.ts, auth.ts, standings.ts, playoffs.ts,
                     scheduler/{index.ts,roundRobin.ts}
    components/      Nav, StandingsTable, MatchCard, Bracket, ScoreInput, ...
  public/            logo.svg
  Dockerfile         Next.js standalone runtime image
  docker-compose.yml app (+ optional postgres) + volume for the DB
  .gitlab-ci.yml     build → push to registry → deploy to server
  .dockerignore
  .env               ADMIN_PASSWORD, DATABASE_URL="file:./dev.db"
  package.json, tsconfig.json, tailwind.config.ts, vitest.config.ts
```

## Implementation Phases

1. **Scaffold** — Next.js + TS + Tailwind; theme tokens, Nav, logo, layout/branding.
2. **Data** — Prisma schema + initial migration; `db.ts` client singleton; `seed.ts` with ~12 sample teams.
3. **Scheduler** — strategy interface + `RoundRobinStrategy`; Vitest tests (plays-once-per-week, match count, byes, week cap/cycle).
4. **Standings** — compute + seed with tiebreakers; tests.
5. **Public pages** — standings (home) and schedule with open score entry (server actions).
6. **Admin** — password login + cookie guard; dashboard: teams CRUD, season config, generate/regenerate schedule, score override.
7. **Playoffs** — bracket generation + advancement logic + bracket page; tests for seeding/byes.
8. **Polish** — laptop-first layout pass (graceful on mobile), empty states, winner highlighting, final branding pass.
9. **Containerize & deploy** — `Dockerfile` (standalone) + `docker-compose.yml` + `.gitlab-ci.yml`; `prisma migrate deploy` on startup; document the server deploy + DNS handoff in `README.md`.

## Deployment (internal company server via GitLab)

Assumed target: an accessible internal Linux server (Docker-capable) on the company network.

- **Dev loop (WSL):** `npm run dev` with a local SQLite file. No networking gymnastics needed locally.
- **Build & ship (GitLab CI):** on push, `.gitlab-ci.yml` runs `lint/test → docker build → push to GitLab Container Registry → deploy`.
- **Deploy to the server:** the deploy job connects to the server (SSH deploy key in CI vars) and runs `docker compose pull && docker compose up -d`. The container runs `prisma migrate deploy`, then starts Next.js on port 80 (or behind the server's reverse proxy).
- **Data persistence:** the SQLite file (or Postgres data) lives on a Docker **volume**, so redeploys don't wipe scores. A simple nightly file/volume backup is recommended.
- **Access / `pickleball/` name:** IT points an internal **DNS name** at the server (e.g. `pickleball` or `pickleball.<corp-domain>`), so typing `pickleball/` resolves to it. This is an IT/DNS handoff, not app code.
- **Prereqs to confirm with IT/DevOps:** Docker on the server, inbound 80/443 allowed, an SSH deploy target (or a GitLab runner on/near the server), and the DNS name.

## Verification

- `npm test` — scheduler, standings, and bracket unit tests pass.
- Manual end-to-end via the running app:
  1. Admin login → create 12 teams → set 6 weeks → Generate schedule. Confirm 6 weeks × 6 matches, each team once/week.
  2. Submit scores (e.g. `2`–`1`) on `/schedule` as a normal user (no password) → standings update with correct seeding/tiebreakers.
  3. Generate playoff bracket from seeding (try top-4, top-6, and **all teams** to exercise byes) → enter scores → winners advance.
  4. Confirm admin-only actions are blocked without the password; score entry works without it.
  5. Confirm Mission Control theme + logo render correctly at laptop width (and don't break on a phone).
- **Deploy smoke test:** `docker build` locally and run the container against a volume; hit it in a browser; confirm migrations applied and that scores **persist across a container restart**. Then verify the CI pipeline builds + deploys to the server and the DNS name resolves to the app.

## Defaults I chose (easy to change)

- Stack: Next.js + Prisma/SQLite (vs. a lighter Express/Vite split).
- Hosting: Docker container on an internal server, deployed via GitLab CI/CD; SQLite on a volume (swappable to Postgres).
- Playoffs: single elimination; admin-set team count, anywhere from a small bracket up to all teams (default top 8, or all teams if fewer than 8).
- Visual style: Mission Control; logo: Rocket-ball mark; laptop/desktop-first.
- One match per team per week.
- Open, editable score entry for everyone; admin can override anything.
