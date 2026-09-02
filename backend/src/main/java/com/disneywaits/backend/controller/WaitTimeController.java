package com.disneywaits.backend.controller;

import com.disneywaits.backend.dto.HourlyAverage;
import com.disneywaits.backend.dto.WeekdayAverage;
import com.disneywaits.backend.model.WaitTime;
import com.disneywaits.backend.service.WaitTimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/waittimes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WaitTimeController {

    private final WaitTimeService waitTimeService;

    // GET /api/waittimes
    @GetMapping
    public ResponseEntity<List<WaitTime>> getAllWaitTimes() {
        return ResponseEntity.ok(waitTimeService.getAllWaitTimes());
    }

    // GET /api/waittimes/park?name=Magic Kingdom
    @GetMapping("/park")
    public ResponseEntity<List<WaitTime>> getByPark(@RequestParam String name) {
        return ResponseEntity.ok(waitTimeService.getWaitTimesByPark(name));
    }

    // GET /api/waittimes/ride?name=Space Mountain
    @GetMapping("/ride")
    public ResponseEntity<List<WaitTime>> getByRide(@RequestParam String name) {
        return ResponseEntity.ok(waitTimeService.getWaitTimesByRide(name));
    }

    // GET /api/waittimes/trends?ride=Space Mountain
    @GetMapping("/trends")
    public ResponseEntity<List<Object[]>> getYearOverYearTrends(@RequestParam String ride) {
        return ResponseEntity.ok(waitTimeService.getYearOverYearAverages(ride));
    }

    // GET /api/waittimes/latest
    @GetMapping("/latest")
    public ResponseEntity<List<WaitTime>> getLastestSnapshot() {
        return ResponseEntity.ok(waitTimeService.getLatestSnapshot());
    }

    // GET /api/waittimes/by-hour
    // GET /api/waittimes/by-hour?ride=Space Mountain
    @GetMapping("/by-hour")
    public ResponseEntity<List<HourlyAverage>> getAverageByHour(
            @RequestParam(required = false) String ride) {
        return ResponseEntity.ok(waitTimeService.getAverageWaitByHourOfDay(ride));
    }

    // GET /api/waittimes/by-weekday
    @GetMapping("/by-weekday")
    public ResponseEntity<List<WeekdayAverage>> getAverageByWeekday() {
        return ResponseEntity.ok(waitTimeService.getAverageWaitByDayOfWeek());
    }

}