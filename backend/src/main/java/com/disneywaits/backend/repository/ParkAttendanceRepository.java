package com.disneywaits.backend.repository;

import com.disneywaits.backend.model.ParkAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParkAttendanceRepository
        extends JpaRepository<ParkAttendance, ParkAttendance.ParkAttendanceId> {

    // Attendance rows for one park, oldest year first (for year-over-year charts)
    List<ParkAttendance> findByParkIdOrderByYearAsc(Integer parkId);

}
