package com.disneywaits.backend.repository;

import com.disneywaits.backend.model.WaitTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WaitTimeRepository extends JpaRepository<WaitTime, Long> {

    // Find all wait times for a specific park
    List<WaitTime> findByParkName(String parkName);

    // Find all wait times for a specific ride
    List<WaitTime> findByRideName(String rideName);

    // Get average wait time per year for a specific ride
    @Query("SELECT YEAR(w.recordedAt), AVG(w.waitMinutes) " +
           "FROM WaitTime w " +
           "WHERE w.rideName = :rideName " +
           "GROUP BY YEAR(w.recordedAt) " +
           "ORDER BY YEAR(w.recordedAt)")
    List<Object[]> findAverageWaitTimeByYear(String rideName);

    /*
     * Hard-ticket party attractions are excluded everywhere below. Mickey's Not-So-Scary
     * Halloween Party and Very Merry Christmas Party meet-and-greets sit in the feed all
     * year with is_open = false, then open only during the paid evening event — where they
     * post 60-80 minute waits and dominate the live view. Because they open only in the
     * evening they also inflate exactly the hours the daily peak sits in (22:00 reads 12.8
     * min with them, 10.8 without). They are not part of a normal park day.
     *
     * Matched by event name, which is safe here: unlike the ride names these are plain
     * ASCII. "Mad Tea Party" is untouched — it contains neither event phrase.
     */

    @Query("""
            SELECT w FROM WaitTime w
            WHERE w.recordedAt = (SELECT MAX(w2.recordedAt) FROM WaitTime w2)
              AND w.rideName NOT LIKE '%Not-So-Scary%'
              AND w.rideName NOT LIKE '%Very Merry%'
            """)
    List<WaitTime> findLatestSnapshot();

    /*
     * The two aggregates below are native Postgres queries for one reason: recorded_at is
     * stored as UTC, but "hour of day" is only meaningful in park local time. Chaining
     * AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York' reads the naive column as UTC and
     * renders it as Eastern, letting Postgres apply the correct DST offset per row (EDT in
     * summer, EST in winter) instead of us hard-coding a shift that would be wrong half the
     * year. Closed rides report wait_minutes = 0, so they are excluded — otherwise every
     * overnight hour would average toward zero and flatten the real curve.
     */

    /*
     * Several entries in the source feed are not things anyone queues for — Cinderella
     * Castle, a splash pad, a walking scavenger hunt, the Main Street vehicles. They report
     * a wait of 0 forever, so averaging them in drags every figure toward zero and produces
     * a number that describes no actual guest. Identify them from the data (a ride that has
     * never once posted a wait) rather than a hard-coded name list: the feed mixes straight
     * and curly apostrophes, so a literal list would silently fail to match.
     *
     * The subquery below is written out in both aggregates rather than shared as a constant.
     * Java text blocks strip trailing whitespace from every line, so building the SQL by
     * concatenation silently glued "AND" to the next token and produced "ANDride_name".
     * Spelling each query out keeps it obvious and unbreakable.
     *
     * The HAVING floor exists because ingestion is best-effort: a few buckets rested on a
     * single observation, and the 2-4 AM points plotted as a hard zero that dominated the
     * chart's shape. Kept low because a per-ride view splits the data across ~18 hours.
     */

    // Average wait per hour of the park day. Pass null for rideName to cover every ride.
    @Query(value = """
            SELECT EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'),
                   AVG(wait_minutes),
                   COUNT(*)
            FROM wait_times
            WHERE is_open = true
              AND (CAST(:rideName AS text) IS NULL OR ride_name = CAST(:rideName AS text))
              AND ride_name NOT LIKE '%Not-So-Scary%'
              AND ride_name NOT LIKE '%Very Merry%'
              AND ride_name IN (
                  SELECT ride_name FROM wait_times WHERE is_open = true
                  GROUP BY ride_name HAVING MAX(wait_minutes) > 0
              )
            GROUP BY 1
            HAVING COUNT(*) >= 3
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> findAverageWaitByHourOfDay(@Param("rideName") String rideName);

    // Average wait per day of week, 0 = Sunday through 6 = Saturday.
    @Query(value = """
            SELECT EXTRACT(DOW FROM recorded_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'),
                   AVG(wait_minutes),
                   COUNT(*)
            FROM wait_times
            WHERE is_open = true
              AND ride_name NOT LIKE '%Not-So-Scary%'
              AND ride_name NOT LIKE '%Very Merry%'
              AND ride_name IN (
                  SELECT ride_name FROM wait_times WHERE is_open = true
                  GROUP BY ride_name HAVING MAX(wait_minutes) > 0
              )
            GROUP BY 1
            HAVING COUNT(*) >= 3
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> findAverageWaitByDayOfWeek();

    /*
     * Rides for the picker, busiest first, so the dropdown reads most in-demand to least.
     * The observation floor keeps one-off seasonal attractions (a Halloween-party meet with
     * 23 readings) from topping the list on a handful of samples.
     */
    @Query(value = """
            SELECT ride_name
            FROM wait_times
            WHERE is_open = true
              AND ride_name NOT LIKE '%Not-So-Scary%'
              AND ride_name NOT LIKE '%Very Merry%'
            GROUP BY ride_name
            HAVING MAX(wait_minutes) > 0 AND COUNT(*) >= 50
            ORDER BY AVG(wait_minutes) DESC
            """, nativeQuery = true)
    List<String> findRideNamesByDemand();
}