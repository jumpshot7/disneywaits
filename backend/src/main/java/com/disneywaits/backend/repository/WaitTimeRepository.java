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

    @Query("SELECT w FROM WaitTime w WHERE w.recordedAt = (SELECT MAX(w2.recordedAt) FROM WaitTime w2)")
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

    // Average wait per hour of the park day. Pass null for rideName to cover every ride.
    @Query(value = """
            SELECT EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'),
                   AVG(wait_minutes),
                   COUNT(*)
            FROM wait_times
            WHERE is_open = true
              AND (CAST(:rideName AS text) IS NULL OR ride_name = CAST(:rideName AS text))
            GROUP BY 1
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
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> findAverageWaitByDayOfWeek();
}