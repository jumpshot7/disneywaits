# Changelog

Engineering log for the work of **September 1–3, 2026**. Ordered by theme rather than
chronology, because several threads ran in parallel. Each entry records what changed and
*why* — the reasoning is usually the part worth keeping.

---

## 1. Ingestion moved off GitHub Actions to Azure Functions

The largest change, and the one the whole project depended on.

### The problem

`ingest.yml` asked for a snapshot every 30 minutes (48/day). It was delivering about **6**,
and had decayed over time:

```
2026-08-22   33 snapshots/day
2026-08-25   24
2026-08-26   16
2026-08-27    3    <- falls off
2026-09-02    6
```

Every run that fired **succeeded** — 46/46 — so this was never a code bug. The repository is
public, so it was not an Actions-minutes quota either. GitHub documents scheduled workflows as
best-effort: runs are delayed or dropped under load, and repositories that schedule frequently
are progressively deprioritized.

This mattered more than any feature. The project exists to answer *"are Magic Kingdom wait
times getting worse?"*, which requires evenly sampled history. At 6 snapshots/day the dataset
was accumulating permanent gaps, and queue-times.com serves live data only — nothing missed can
ever be backfilled.

### Attempt 1 — re-point the cron (failed)

Moved `ingest.yml` to `7,37 * * * *` and `keep-alive.yml` to `11,31,51 * * * *`, on the theory
that `*/30` and `*/20` are among the most-used cron expressions on GitHub and were losing a
contention race at round minutes.

**It changed nothing.** A full day later, still ~6 runs. The decisive evidence was *when* runs
actually fired:

```
:18  :45  :05  :23  :20  :34  :46  :58  :06  :28
```

Nowhere near the requested `:07`/`:37`. GitHub was **delaying** runs by arbitrary amounts, not
dropping ones that collided on a busy minute — so which slot you request barely matters. No
cron expression fixes deprioritization.

### Attempt 2 — Azure Functions timer trigger (worked)

| | |
|---|---|
| Function App | `disneywaits-ingest` |
| Plan | **Flex Consumption** (Linux, Python 3.11, 512 MB) |
| Region | North Central US |
| Schedule | `0 */30 * * * *` (NCRONTAB, every 30 min) |

Confirmed working — three consecutive fires, each within a second of its slot and none matching
any GitHub run:

```
2026-09-03 02:00:00.747919
2026-09-03 02:30:00.688097
2026-09-03 03:00:00.991306
```

For comparison, the GitHub cron never once landed on its requested minute in three weeks.

**New files:** `functions/ingest_core.py` (the ingestion logic, now the single
implementation), `functions/function_app.py` (the timer trigger),
`functions/{requirements.txt,host.json,.funcignore}`, and
`.github/workflows/deploy-functions.yml`.

**Removed:** `.github/workflows/ingest.yml` and `pipeline/main.py` — only after the timer was
confirmed firing. A brief period of both writing was accepted deliberately; a double-write is
harmless, a collection gap is not.

### Deployment notes (three dead ends worth recording)

1. **The portal no longer offers classic Linux Consumption for Python.** Its "Consumption"
   option is *Consumption (Windows)*, and Azure Functions Python is Linux-only — Python is not
   even offered as a runtime there. Flex Consumption is the replacement.
2. **Publish-profile deployment cannot work on Flex Consumption.** A publish profile carries
   only Kudu credentials, so `Azure/functions-action` cannot query ARM to learn the app's SKU
   and falls back to the legacy `zipDeploy` endpoint, which Flex does not expose → `404`.
   Adjusting the Oryx/Kudu build flags does not change this; the fallback is not flag-driven.
   The fix is a real Azure sign-in.
3. **Two federated credentials are required.** GitHub presents the classic OIDC subject
   `repo:jumpshot7/disneywaits:ref:refs/heads/main`. The portal's "GitHub Actions" scenario
   builds the newer immutable-ID subject (`repo:org@ID/repo@ID:...`), which does **not** match
   and fails with `AADSTS700213`. The working credential was added through the *"Other issuer"*
   scenario with the subject typed manually. Both are kept so either format works.

Final working setup: `azure/login` (OIDC, no stored password) + `functions-action` with
`remote-build: true`, and `permissions: id-token: write` on the job — without which the login
fails before it ever reaches Azure.

---

## 2. Accumulated history surfaced (new feature)

The database held ~16,000 rows across six weeks. The dashboard displayed **43** — the current
snapshot only. None of the accumulated history was visible anywhere, so the project's headline
question went unanswered by its own UI.

The existing `/trends` endpoint grouped by `YEAR(recorded_at)`. With every row from 2026 it
returned exactly one row, and could not produce a trend before January 2027.

**Added**, at a granularity the data actually supports:

| Endpoint | Returns |
|---|---|
| `GET /api/waittimes/by-hour` | average wait per hour of the park day; optional `?ride=` |
| `GET /api/waittimes/by-weekday` | average wait per day of week |
| `GET /api/waittimes/rides` | queueable rides, busiest first (drives the picker) |

Plus `dto/HourlyAverage` and `dto/WeekdayAverage`, so responses are clean JSON rather than the
raw `Object[]` shape `/trends` still returns (`{"value":[2026,15.12],"Count":2}`), and two new
dashboard charts.

---

## 3. Data-correctness fixes

Four separate defects, each of which would have produced a plausible-looking but wrong chart.

### Timestamps were UTC, charts needed park local time

`pipeline/main.py` recorded `datetime.now()` — the host clock. CI runners are UTC; Magic
Kingdom is Eastern. A snapshot taken at **4 PM at the park** was stored as **20:00**.

Verified rather than assumed: a workflow run started at `20:05:11Z` and the matching row read
`20:05:22` — 11 seconds apart, confirming stored values are UTC wall-clock.

Harmless while the UI only showed "right now"; fatal for an hour-of-day chart:

| | naive (wrong) | corrected |
|---|---|---|
| 7 AM | 0.0 — "closed" | 10.3 min — park opens |
| **Peak** | **10 PM** | **6 PM** |

Fixed by converting in SQL — `AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'` — which lets
Postgres apply the correct DST offset per row rather than hard-coding a shift that would be
wrong half the year. Ingestion now records explicit UTC so a local run cannot mix Eastern rows
into a UTC dataset.

### Averaging every "attraction" produced a meaningless number

The feed lists 43 entries, of which **16 average under 10 minutes** and only **3 over 40**. It
counts Cinderella Castle (a building), Casey Jr. Splash 'N' Soak Station (a splash pad), Main
Street Vehicles, and a walking scavenger hunt as rides — all reporting a wait of `0` forever.
Averaging TRON with a castle produced a flat ~18 min line describing no guest's experience.

Excluded anything that has never posted a wait, derived from the data via
`HAVING MAX(wait_minutes) > 0` rather than a hard-coded name list — **the feed mixes straight
and curly apostrophes** (`Buzz Lightyear’s` uses U+2019 while `Peter Pan's` uses ASCII), so a
literal list would have silently dropped Buzz Lightyear with no error.

A ride picker was added so the chart can show one attraction at a time, which is where the data
is genuinely meaningful: *TRON reads 38 min at 8 AM rising to 57 min by 5 PM.*

### Hard-ticket party attractions distorted everything

Mickey's Not-So-Scary Halloween Party meet-and-greets topped the live view at 60–80 minutes.
They are **not** seasonal-sparse as first assumed — they appear in all 378 snapshots with
`is_open = false`, then open only during the paid evening event. Because they open only late,
they inflated exactly the hours the daily peak sits in:

| hour | with party | without |
|---|---|---|
| 21:00 | 16.3 min | 15.2 min |
| 22:00 | 12.8 min | **10.8 min** |
| 23:00 | 11.1 min | 10.0 min |

Excluded throughout by event name — safe here because, unlike the ride names, these entries are
plain ASCII. `Very Merry` is matched too so December's Christmas party does not repeat this.
`Mad Tea Party` is untouched.

### Single-observation buckets plotted as hard zeros

Uneven sampling left some overnight hours resting on one reading, which rendered as a cliff to
zero that dominated the chart's shape and squashed the real 10–22 min range. Buckets now
require **3+ observations**, and every aggregate returns its `sampleCount` so a figure resting
on thin data is visible rather than quietly misleading.

---

## 4. Dashboard redesign

The charts were legible but read as generic. Specific fixes:

- **Long ride names clipped mid-word** on a rotated axis (`~ven Dwarfs Mine Train`). The
  Top-10 chart is now **horizontal**, the standard fix for long category labels — names read
  left to right at full size. Character-meet names are shortened by dropping the venue
  (`… at Mickey's Not-So-Scary Halloween Party`), which is noise on an axis.
- **Tooltip grew to whatever width a ride name needed**, covering the plot it described. Now a
  width-capped component that wraps, with the **value first and the label second** — the reader
  is already on the mark and wants the number.
- **Bars were tinted by their own wait length** (orange >60, blue >30, green below). This is a
  documented anti-pattern: bar length already encodes magnitude, so coloring by magnitude
  repeats it and spends the only free channel on nothing. Replaced with **one accent across
  every mark**, validated for contrast against the dark surface.
- **Dashed gridlines → solid hairlines**, and axis rules removed, so chrome recedes.
- **Global monospace and wide letter-spacing removed.** Geist Sans was already loaded and
  unused while `font-mono` was applied to everything including hero numbers.
- Added a snapshot timestamp to the header.

---

## 5. Database cleanup

Deleted **42 rows** — one snapshot, `2026-07-22 20:50:23.309644`. Table went 16,081 → 16,039.

Justified by an audit cross-referencing every distinct snapshot against GitHub workflow run
times: **373 of 374 snapshots matched a CI run** and are therefore trustworthy UTC. The single
unmatched one was written by a local machine, so its timezone is unknown, and it sat three
weeks before continuous collection began (Aug 14) — it could not contribute to any trend.

Everything from Aug 27 onward was deliberately **kept**. That data is sparse, not wrong; each
row is a true observation. Sparse data is a display problem, solved by the sample-count filter,
which is reversible. Deletion is not, and nothing dropped can be re-fetched.

A restorable backup of the deleted rows was written outside the repository before the delete
ran.

---

## 6. Repository housekeeping

- Deleted three fully-merged stale branches (`feat/azure-deploy`,
  `feat/park-attendance-slice`) — `feat/azure-deploy` had been reused for five consecutive PRs
  and was 7 commits behind `main`, making it a trap for anyone checking it out from habit.
- Stopped tracking `.claude/settings.json` (auto-generated, contained an absolute path to a
  machine-local temp directory) and added `.claude/` to `.gitignore`.
- README rewritten: live URLs added (they were missing entirely), endpoint table corrected to
  include `/latest`, `/rides`, `/by-hour`, `/by-weekday` and the attendance routes, and the
  data caveats above documented so the filtering rules are not mysterious.

---

## Bugs introduced and fixed during this work

Recorded because both were caught by verification that a passing build did not provide.

**Aggregate SQL broken by Java text-block concatenation.** Both aggregate endpoints returned
`500` in production. Java text blocks strip trailing whitespace from every line, so a block
ending `AND ` concatenated with a shared constant produced `ANDride_name`. The same stripping
turned `COUNT(*) >= ` into `>=3`, which parsed fine and therefore hid the pattern. The broken
version **compiled cleanly** and the frontend built cleanly; only calling the endpoint revealed
it. Fixed by writing the SQL out in full in both queries — mild duplication in exchange for no
invisible whitespace dependency.

**A publish profile that authenticated but could not deploy.** Two deploy attempts failed on
the assumption that build flags were steering the action to the wrong endpoint. They were not;
the cause was the missing ARM access described in §1.

Both argue for the same missing thing: **backend tests**. `BackendApplicationTests` is still
the generated `contextLoads()` stub. The timezone conversion, the open-rides filter, and the
queueable-rides filter are exactly the logic a test should pin.

---

## Commits

| Commit | Description |
|---|---|
| `870fc1c` | ci: offset scheduled crons off congested round minutes |
| `f5e2ffb` | feat: surface accumulated history as hour-of-day and weekday aggregates |
| `342d371` | fix: make hour-of-day aggregates meaningful |
| `88ef915` | chore: stop tracking .claude local settings |
| `9f44525` | fix: repair aggregate SQL broken by text-block concatenation |
| `e490b0e` | style: rework dashboard visuals and fix chart hover |
| `ab2e744` | fix: exclude hard-ticket party attractions |
| `0afdfe6` | feat: add Azure Functions timer trigger for ingestion |
| `865b9fb` | fix: use one-deploy path for Flex Consumption |
| `991950c` | fix: deploy the function via Azure sign-in instead of a publish profile |
| `99ebd35` | chore: retire the GitHub Actions ingestion cron |

18 files changed, 1,037 insertions, 351 deletions.

---

## Still open

1. **Backend tests** — the most conspicuous gap, and the one this work kept demonstrating.
2. **Pagination on `/api/waittimes`** — returns the full table; the dashboard downloads all of
   it to render four stat tiles.
3. **Housekeeping** — scratch scripts in `pipeline/`, default Next.js SVGs in
   `frontend/public/`, committed `frontend/CLAUDE.md` and `AGENTS.md`.
4. **The trend chart** — deliberately not built. "Are wait times getting worse" needs months of
   consistent sampling; with ~3 weeks of degraded collection, a naive weekly average would have
   read **19.6 → 17.3 → 11.6 min** and announced that waits were improving. They were not — the
   observation counts behind those figures were 3,842 → 1,432 → 240. The chart would have been
   reporting the collapse of the data pipeline as good news. Worth building once the Azure timer
   has accumulated real history.
