# DisneyWaits — Disney World Wait Time Trend Analyzer
 
This project is a full-stack data engineering application that answers one question: **"Are Disney World wait times actually getting worse year over year, or is it just a feeling?"**
 
Using 10+ years of historical wait time data from Magic Kingdom attractions, DisneyWaits ingests, stores, and analyzes ride wait times to surface crowd trends, seasonal patterns, and year-over-year comparisons across Disney World's most popular rides.
 
## Architecture & Tech Stack
 
The project is split into three main components:
 
- **Data Pipeline (`pipeline/`)**:
    - Fetches live and historical wait time data from the Queue-Times.com public API.
    - Normalizes and validates ride data before bulk upserting into PostgreSQL with duplicate prevention via unique constraints.
    - Runs on a schedule to continuously ingest new snapshots, building a growing historical dataset over time.
- **Backend API (`backend/`)**:
    - A Spring Boot (Java 21) REST API built with Spring Data JPA, exposing endpoints for year-over-year trend analysis, ride-level breakdowns, and seasonal averages.
    - Uses JPQL aggregate queries to compute historical wait time statistics directly from PostgreSQL.
- **Frontend (`frontend/`)**:
    - A Next.js + TypeScript dashboard with interactive Recharts visualizations.
    - Displays crowd trend charts, ride-level wait time history, and seasonal patterns across Magic Kingdom attractions.
## Repository Structure
 
```text
.
├── backend/       # Spring Boot REST API (Java 21, Spring Data JPA, PostgreSQL)
├── frontend/      # Next.js + TypeScript dashboard with Recharts visualizations
├── pipeline/      # Python data ingestion pipeline (httpx, pandas, psycopg2)
└── docker-compose.yml  # Orchestrates backend, frontend, and PostgreSQL
```