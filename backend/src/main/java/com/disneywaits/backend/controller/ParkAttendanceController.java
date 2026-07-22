package com.disneywaits.backend.controller;

import com.disneywaits.backend.model.ParkAttendance;
import com.disneywaits.backend.service.ParkAttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ParkAttendanceController {

    private final ParkAttendanceService parkAttendanceService;

    // GET /api/attendance
    @GetMapping
    public ResponseEntity<List<ParkAttendance>> getAllAttendance() {
        return ResponseEntity.ok(parkAttendanceService.getAllAttendance());
    }

    // GET /api/attendance/park?parkId=6
    @GetMapping("/park")
    public ResponseEntity<List<ParkAttendance>> getByPark(@RequestParam Integer parkId) {
        return ResponseEntity.ok(parkAttendanceService.getAttendanceByPark(parkId));
    }

}
