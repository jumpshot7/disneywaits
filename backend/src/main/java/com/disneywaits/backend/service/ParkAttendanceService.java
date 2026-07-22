package com.disneywaits.backend.service;

import com.disneywaits.backend.model.ParkAttendance;
import com.disneywaits.backend.repository.ParkAttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParkAttendanceService {

    private final ParkAttendanceRepository parkAttendanceRepository;

    // Get all attendance records
    public List<ParkAttendance> getAllAttendance() {
        return parkAttendanceRepository.findAll();
    }

    // Get attendance for a park, ordered oldest year first
    public List<ParkAttendance> getAttendanceByPark(Integer parkId) {
        return parkAttendanceRepository.findByParkIdOrderByYearAsc(parkId);
    }

}
