import httpx
import json
import time

PARK_ID = 6
USER_AGENT = "disneywaits-student-portfolio/1.0 (github.com/jumpshot7; educational use for a personal project!)"

ENDPOINTS = [
    ("attendance_by_year",  f"https://queue-times.com/parks/{PARK_ID}/attendances/attendance_by_year"),
    ("crowd_rank_by_day",   f"https://queue-times.com/parks/{PARK_ID}/crowd_rank_by_day"),
    ("uptime_last_week",    f"https://queue-times.com/parks/{PARK_ID}/uptime_last_week"),
    ("uptime_all_time",     f"https://queue-times.com/parks/{PARK_ID}/uptime_all_time"),
]

headers = {"User-Agent": USER_AGENT}

for name, url in ENDPOINTS:
    print(f"\n{'='*60}")
    print(f"ENDPOINT: {name}")
    print(f"URL: {url}")
    print("="*60)
    try:
        response = httpx.get(url, headers=headers, timeout=15)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Response body: {response.text[:500]}")
    except Exception as e:
        print(f"ERROR: {e}")
    time.sleep(1)
