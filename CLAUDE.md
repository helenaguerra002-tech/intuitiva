# Better — Helena's fitness + food companion until 31 Dec 2026

One private app for three goals: leaner body composition, running consistency, and food peace
(fewer binges acted on). English, light theme only, warm editorial design (cream / sand / olive).
Replaced **Intuitiva** (the Portuguese intuitive-eating diary) in place on 4 Sep 2026 — same repo,
same URL, fresh data. Helena did not want the old entries; there is no migration path.

**Live:** https://helenaguerra002-tech.github.io/intuitiva/
**Repo:** `helenaguerra002-tech/intuitiva` (public — code only, never data)

## Architecture

Static PWA, **no backend, no build step**. GitHub Pages serves `main` directly.

```
index.html      shell only: 5 <section class="view">, bottom nav, #sheet, #toast, script tags
styles.css      all CSS (design tokens in :root)
js/util.js      $, esc, dates, toast, sheet, chips, compressImage, gaugeSVG, ICON
js/data.js      LS keys, IDB photos, settings, backup export/import, wipe   (loads first)
js/runs.js      fetches runs from the running app
js/yearmap.js   the day-grid calendar
js/wins.js      milestone detection
js/learn.js     the Brewer / Hansen / RAIN copy
js/views/*.js   home, meals, train, urges, more
js/app.js       go(), init, service-worker registration
dev/seed.js     dev only, loaded when the URL has ?dev=1 — never precached
sw.js           network-first with cache fallback, same-origin only
```

Plain `<script src>` tags share one global scope, in the order above. Top-level `function`
declarations are the public surface; module tables are prefixed (`MEAL_CONTEXTS`, `URGE_TRIGGERS`)
because a duplicated top-level `const` across files is a SyntaxError.

**When changing any file, bump both `?v=N` in `index.html` and `CACHE` in `sw.js` together**, and
add any new file to `ASSETS` in `sw.js` (a missing entry makes `addAll` reject and the SW never
installs). On the phone, close and reopen the app twice for the new worker to take over.

Local dev: `python3 -m http.server 8000` then `http://localhost:8000/?dev=1`. **Port 8000 matters** —
it is one of the origins allowlisted by the running app's CORS config.

## ⚠ Where the data lives

**Only in the browser on Helena's phone.** Nothing is sent anywhere.

- `localStorage`, all keys `better_*`: `entries`, `sessions`, `urges`, `inspo`, `weight`,
  `progress`, `settings`, `runs` (cache, excluded from backup), `winsSeen`, `lastBackup`, `schema`.
- `IndexedDB better-photos` → store `photos`, out-of-line keys. Prefixes: `p…` meal photos
  (600 px / q0.72), `i…` inspiration (1400 px / q0.80), `g…` progress photos (1000 px / q0.75).

**The export is the only safety net.** More → Backup writes one JSON with every record and every
photo as a data URL, offered through the iOS share sheet (`<a download>` is unreliable in a
standalone PWA). Import replaces everything. A banner nags after 7 days. Clearing site data or
deleting the installed app loses everything since the last export.

**Use the installed app, not a Safari tab** — Safari may evict storage for a site not visited in
7 days; the installed app is exempt.

## Running data

Runs are read live from the Run Tracker: `GET /api/sync` (tokens-only, throttled to 5 min) then
`GET /api/activities`, cached in `better_runs` for offline. This needs CORS on that backend —
`backend/main.py` allows GET from `https://helenaguerra002-tech.github.io` and localhost:8000
(commit `f58407c` there). Render cold-starts can exceed 20 s, hence 60 s timeouts and a "waking"
state. If the runs list is empty, her Garmin token on Render has expired: open the running app and
tap Sync once. The training plan stays in the running app; this app only reads activities.

## Decisions that are not accidents (do not "fix")

- **No calories or macros anywhere** unless Settings → "Show calories and macros" is on. It is off
  by default. Restriction feeds urges; that is the whole point.
- Weight is weekly, one reading per week enforced, hidden behind More → Body, never near meals.
  Progress photos are monthly and sit next to the goal photo in the same tucked-away place.
- "Held you for" is **computed** from the gap between consecutive meals (only 20 min–10 h, so it
  never crosses a night). Never a typed field.
- Protein is a neutral question phrased as something to *add*, never to swap out or account for.
- Urge outcomes are all logged the same way, with the same toast. "I acted on it" gets no red
  colour, no broken streak, no penalty. Patterns need ≥5 finished meals before they appear.
- The year map marks are positional (fixed quadrants: run, strength, meal, urge) so they read
  without relying on colour.
- Photos load through a **rect sweep on scroll, not IntersectionObserver** — the observer silently
  never fires in some contexts (hidden tab, PWA restored from background) and leaves every photo
  blank. Do not "modernise" this back.
- Light theme only.

## Publishing

```bash
git add -A && git commit -m "..." && git push
```

`.gitignore` keeps `Inspo/` (Helena's personal reference photos) and `.DS_Store` out — the repo is
public. Inspiration photos belong **in the app**, added from the camera roll, never committed.
