import httpx
import time

PARK_ID = 6
BASE = f"https://queue-times.com/parks/{PARK_ID}/crowd_rank_by_day"
HEADERS = {"User-Agent": "disneywaits-student-portfolio/1.0 (github.com/jumpshot7; educational use)"}

probes = [
    {},
    {"year": "2024"},
    {"year": "2023"},
    {"start": "2023-01-01", "end": "2023-12-31"},
    {"from": "2023-01-01", "to": "2023-12-31"},
    {"start_date": "2023-01-01", "end_date": "2023-12-31"},
    {"range": "year"},
    {"range": "all"},
]

for params in probes:
    r = httpx.get(BASE, params=params, headers=HEADERS, timeout=15)
    data = r.json()

    if isinstance(data, list) and len(data) > 0:
        first_series = data[0]
        dates = list(first_series.get("data", {}).keys())
        date_range = f"{min(dates)} → {max(dates)} ({len(dates)} days)" if dates else "empty"
    else:
        date_range = str(data)[:120]

    print(f"params={params or '(none)'}  status={r.status_code}  dates={date_range}")
    time.sleep(1)
