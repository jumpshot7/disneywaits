import httpx
import psycopg2

# Park ID 6 = Magic Kingdom
PARK_ID = 6
ATTENDANCE_URL = f"https://queue-times.com/parks/{PARK_ID}/attendances/attendance_by_year"
USER_AGENT = "disneywaits-student-portfolio/1.0 (educational use for a personal project)"

# Database connection (matches docker-compose.yml / application.properties)
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="disneywaits",
    user="disney",
    password="magic"
)
cursor = conn.cursor()

# Ensure the table exists (mirrors the ParkAttendance JPA model so this script
# can run against a fresh database without the backend having booted first)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS park_attendance (
        park_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        attendance BIGINT NOT NULL,
        PRIMARY KEY (park_id, year)
    )
""")

# Fetch yearly attendance for Magic Kingdom
# Response shape: {"2016": "20395000.0", "2017": "20450000.0", ...}
response = httpx.get(ATTENDANCE_URL, headers={"User-Agent": USER_AGENT}, timeout=15)
data = response.json()

upserted = 0

# Upsert each year so re-running the script is idempotent (composite key = park_id + year)
for year_str, attendance_str in data.items():
    year = int(year_str)
    attendance = int(float(attendance_str))  # values arrive as strings like "20395000.0"
    cursor.execute("""
                   INSERT INTO park_attendance (park_id, year, attendance)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (park_id, year)
                   DO UPDATE SET attendance = EXCLUDED.attendance
                   """,
                   (PARK_ID, year, attendance))
    upserted += 1

conn.commit()
cursor.close()
conn.close()

print(f"Upserted {upserted} yearly attendance records for park {PARK_ID}")
