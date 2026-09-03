# DisneyWaits — Magic Kingdom Wait Time Tracker

DisneyWaits is a full-stack data project built around one question: **"Are Magic Kingdom wait times getting worse over time?"**

It ingests live wait-time snapshots from the [Queue-Times.com](https://queue-times.com) public API, stores them in PostgreSQL, and surfaces them through a Spring Boot REST API and a Next.js dashboard.

## Live

| | |
|---|---|
| **Dashboard** | https://disneywaitsweb.z14.web.core.windows.net/ |
| **API** | https://disneywaits-api-fbcjhyg2dnfnb7ct.northcentralus-01.azurewebsites.net/api/waittimes/latest |

The whole stack runs on Azure — PostgreSQL Flexible Server, App Service for the API, Storage static website for the frontend — deployed by GitHub Actions on every push to `main`. Ingestion runs on a schedule, so the dataset grows without manual intervention.

## A note on the data (and why the project is built this way)

The official Queue-Times.com API only exposes **live** wait times — a snapshot of the current moment, with no historical endpoint. Rather than fabricate a historical dataset, DisneyWaits treats history as something to **accumulate**: the pipeline captures live snapshots over time, building a growing dataset that powers trend analysis as it matures.

Two consequences worth knowing about:

- **Timestamps are stored in UTC; aggregates are reported in park local time.** The pipeline runs on CI runners set to UTC, but "average wait at 4 PM" is only meaningful in Eastern. The aggregation queries convert with `AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'`, which lets Postgres apply the right DST offset per row rather than hard-coding a shift that would be wrong half the year.
- **Sampling is uneven, so every aggregate ships its sample count.** Scheduled runs are best-effort and some hours are far thinner than others. The API returns `sampleCount` alongside each average and the dashboard surfaces it, so a figure resting on three observations is visibly weak instead of quietly misleading.

Closed rides report a wait of 0, so aggregates filter to open rides only — otherwise every overnight hour would average toward zero and flatten the real curve.

Two further filters keep the aggregates honest:

- **Only attractions that actually queue.** The source feed lists Cinderella Castle, a splash pad, the Main Street vehicles and a walking scavenger hunt alongside real rides; all four report a wait of 0 forever. Averaging TRON together with a building produces a number describing no guest's experience, so anything that has never once posted a wait is excluded. That set is derived from the data rather than hard-coded — the feed mixes straight and curly apostrophes, so a literal name list would silently fail to match.
- **A minimum sample floor per bucket.** Some overnight hours rested on a single reading, which plotted as a hard zero and dominated the chart's shape. A bucket needs at least three observations to be reportable.
- **No hard-ticket party attractions.** The Not-So-Scary Halloween and Very Merry Christmas meet-and-greets sit in the feed year-round with `is_open = false`, then open only during the paid evening event, where they post 60–80 minute waits. They topped the live view and, because they open only late, inflated exactly the hours the daily peak sits in (22:00 read 12.8 min with them, 10.8 without). They are not part of a normal park day, so they are excluded throughout.

Because averaging different rides together is only so meaningful, the hour-of-day chart also offers a per-ride view: "Seven Dwarfs Mine Train at 11 AM" is a real answer in a way that "the park at 11 AM" is not.

## Architecture & Tech Stack

- **Ingestion (`functions/`)** — Python on Azure Functions, timer-triggered every 30 minutes.
    - Fetches the current wait time for every Magic Kingdom ride and inserts a UTC-timestamped snapshot into PostgreSQL.
    - Runnable by hand for a one-off snapshot: `python functions/ingest_core.py`.
    - Moved off GitHub Actions cron deliberately — see below.
- **Backend API (`backend/`)** — Spring Boot 3.5 (Java 21, Spring Data JPA).
    - REST endpoints for live and historical wait times, per-park and per-ride lookups, and time-bucketed aggregates computed in park local time.
- **Frontend (`frontend/`)** — Next.js + TypeScript dashboard with Recharts.
    - Live stat cards and a top-10 longest-waits chart, then the historical view: average wait by hour of day, by day of week, and annual attendance.

## Why ingestion runs on Azure Functions, not GitHub Actions

Scheduled GitHub Actions workflows are explicitly best-effort — runs are delayed or dropped under load, and GitHub deprioritizes repositories that schedule frequently. This project asked for a run every 30 minutes (48/day) and was getting **about 6**, with runs firing at minutes unrelated to the requested schedule. Re-pointing the cron at less contended minutes changed nothing, which confirmed the delivery problem was deprioritization rather than slot contention.

Since the whole project depends on evenly sampled history, ingestion moved to an Azure Functions timer trigger, which runs on the Function App's own scheduler. At ~1,440 executions per month it sits far inside the Consumption plan's free grant.

### Deploying the function

The GitHub Actions workflow (`.github/workflows/deploy-functions.yml`) deploys on every push to `main` that touches `functions/`. It needs two repository secrets:

| Secret | Value |
|---|---|
| `AZURE_FUNCTIONAPP_NAME` | the Function App's name |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | the full XML from **Get publish profile** in the portal |

The Function App itself needs the database settings as Application Settings — `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_SSLMODE=require` — and the Postgres server must allow connections from Azure services.

## Repository Structure

```text
.
├── backend/       # Spring Boot REST API (Java 21, Spring Data JPA, PostgreSQL)
├── frontend/      # Next.js + TypeScript dashboard with Recharts visualizations
├── pipeline/      # Python data ingestion pipeline (httpx, psycopg2)
└── docker-compose.yml  # Runs PostgreSQL for local development
```

## Running locally

**1. Start PostgreSQL** (uses the credentials in `backend/src/main/resources/application.properties`):

```bash
docker compose up -d
```

**2. Capture a wait-time snapshot.** In production this runs on a timer in Azure Functions; the same code takes a one-off snapshot locally:

```bash
pip install -r functions/requirements.txt
python functions/ingest_core.py
```

**3. Start the backend API** (serves on `http://localhost:8080`):

```bash
cd backend
./mvnw spring-boot:run
```

**4. Start the frontend** (serves on `http://localhost:3000`):

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the backend URL from `NEXT_PUBLIC_API_BASE_URL` (see `frontend/.env.example`), defaulting to `http://localhost:8080`.

## API Endpoints

| Method | Path                             | Description                                                        |
|--------|----------------------------------|--------------------------------------------------------------------|
| GET    | `/api/waittimes`                 | All recorded wait-time snapshots                                    |
| GET    | `/api/waittimes/latest`          | Only the most recent snapshot — what the dashboard's live view uses |
| GET    | `/api/waittimes/park?name=`      | Snapshots for a given park                                          |
| GET    | `/api/waittimes/ride?name=`      | Snapshots for a given ride                                          |
| GET    | `/api/waittimes/rides`           | Queueable rides, busiest first — drives the dashboard's ride picker |
| GET    | `/api/waittimes/by-hour`         | Average wait per hour of the park day; optional `?ride=` filter     |
| GET    | `/api/waittimes/by-weekday`      | Average wait per day of week                                        |
| GET    | `/api/waittimes/trends?ride=`    | Average wait grouped by year — needs multiple years to say anything |
| GET    | `/api/attendance`                | Annual park attendance, all parks                                   |
| GET    | `/api/attendance/park?parkId=`   | Annual attendance for one park (Magic Kingdom is `6`)               |

`by-hour` and `by-weekday` are the queries that answer the project's actual question; each row carries an `avgWait` and the `sampleCount` behind it.

## Roadmap

- **Backend tests** covering the aggregation queries and controller endpoints.
- **Ride uptime & daily crowd rank** — additional Queue-Times datasets (models scaffolded in `backend/`).
- **Pagination on `/api/waittimes`** — it currently returns the full table, which the dashboard downloads in one request.
- **Containerize the backend & frontend** so `docker compose up` runs the entire stack.
- **Store `recorded_at` as `TIMESTAMPTZ`** so the UTC convention is enforced by the schema rather than by the pipeline.

## Data source

Wait time data is sourced from [Queue-Times.com](https://queue-times.com), a public API that publishes park wait times updated every ~5 minutes.

> Powered by [Queue-Times.com](https://queue-times.com)
