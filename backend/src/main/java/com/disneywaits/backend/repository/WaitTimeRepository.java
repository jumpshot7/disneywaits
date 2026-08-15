package com.disneywaits.backend.repository;

import com.disneywaits.backend.model.WaitTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
}