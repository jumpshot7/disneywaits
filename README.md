# DisneyWaits — Magic Kingdom Wait Time Tracker

DisneyWaits is a full-stack data project built around one question: **"Are Magic Kingdom wait times getting worse over time?"**

It ingests live wait-time snapshots from the [Queue-Times.com](https://queue-times.com) public API, stores them in PostgreSQL, and surfaces them through a Spring Boot REST API and a Next.js dashboard.

## A note on the data (and why the project is built this way)

The official Queue-Times.com API only exposes **live** wait times — a snapshot of the current moment, with no historical endpoint. Rather than fabricate a historical dataset, DisneyWaits treats history as something to **accumulate**: the pipeline captures live snapshots over time, building a growing dataset that powers year-over-year analysis as it matures. The backend's trend query is in place today and becomes more meaningful the longer the pipeline runs.

## Architecture & Tech Stack

- **Data Pipeline (`pipeline/`)** — Python (`httpx`, `psycopg2`).
    - Fetches the current wait time for every Magic Kingdom ride and inserts a timestamped snapshot into PostgreSQL.
    - Designed to be run repeatedly (e.g. via cron or a scheduler) to build history over time.
- **Backend API (`backend/`)** — Spring Boot 3.5 (Java 21, Spring Data JPA).
    - REST endpoints for all wait times, per-park and per-ride lookups, and a JPQL year-over-year average query.
- **Frontend (`frontend/`)** — Next.js + TypeScript dashboard with Recharts.
    - Live stat cards, a top-10 longest-waits bar chart, and a full ride list.

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

**2. Run the ingestion pipeline** to capture a wait-time snapshot:

```bash
cd pipeline
pip install -r requirements.txt
python main.py
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

| Method | Path                          | Description                            |
|--------|-------------------------------|----------------------------------------|
| GET    | `/api/waittimes`              | All recorded wait-time snapshots       |
| GET    | `/api/waittimes/park?name=`   | Snapshots for a given park             |
| GET    | `/api/waittimes/ride?name=`   | Snapshots for a given ride             |
| GET    | `/api/waittimes/trends?ride=` | Year-over-year average wait for a ride |

## Roadmap

- **Scheduled ingestion** — run the pipeline automatically instead of manually.
- **Park attendance** — ingest yearly attendance as a long-term crowd proxy (model scaffolded in `backend/`).
- **Ride uptime & daily crowd rank** — additional Queue-Times datasets (models scaffolded in `backend/`).
- **Containerize the backend & frontend** so `docker compose up` runs the entire stack.
- **Backend tests** covering the repository queries and controller endpoints.

## Data source

Wait time data is sourced from [Queue-Times.com](https://queue-times.com), a public API that publishes park wait times updated every ~5 minutes.

> Powered by [Queue-Times.com](https://queue-times.com)
