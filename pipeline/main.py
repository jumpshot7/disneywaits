import httpx
import psycopg2
from datetime import datetime

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="disneywaits",
    user="disney",
    password="magic"
)
cursor = conn.cursor()

# Fetch Magic Kingdom wait times from Queue-Times API
# Park ID 6 = Magic Kingdom
response = httpx.get("https://queue-times.com/parks/6/queue_times.json")
data = response.json()

recorded_at = datetime.now()
inserted = 0

# Loop through each ride and insert into database
for land in data["lands"]:
    for ride in land["rides"]:
        cursor.execute("""
                       INSERT INTO wait_times (ride_name, park_name, wait_minutes, is_open, recorded_at)
                       VALUES (%s, %s, %s, %s, %s)
                       """,
                       (
                           ride["name"],
                           "Magic Kingdom",
                           ride["wait_time"],
                           ride["is_open"],
                           recorded_at
                       ))
        inserted += 1
conn.commit()
cursor.close()
conn.close()

print(f"Successfully inserted {inserted} wait time records at {recorded_at}")