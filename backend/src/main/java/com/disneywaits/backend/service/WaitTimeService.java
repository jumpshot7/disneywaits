package com.disneywaits.backend.service;

import com.disneywaits.backend.dto.HourlyAverage;
import com.disneywaits.backend.dto.WeekdayAverage;
import com.disneywaits.backend.model.WaitTime;
import com.disneywaits.backend.repository.WaitTimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WaitTimeService {

    // Indexed by Postgres EXTRACT(DOW): 0 = Sunday through 6 = Saturday.
    private static final String[] DAY_NAMES = {
            "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    };

    private final WaitTimeRepository waitTimeRepository;

    // Get all wait times
    public List<WaitTime> getAllWaitTimes() {
        return waitTimeRepository.findAll();
    }

    // Get wait times by park
    public List<WaitTime> getWaitTimesByPark(String parkName) {
        return waitTimeRepository.findByParkName(parkName);
    }

    // Get wait times by ride
    public List<WaitTime> getWaitTimesByRide(String rideName) {
        return waitTimeRepository.findByRideName(rideName);
    }

    // Get year over year averages for a ride
    public List<Object[]> getYearOverYearAverages(String rideName) {
        return waitTimeRepository.findAverageWaitTimeByYear(rideName);
    }

    public List<WaitTime> getLatestSnapshot(){
        return waitTimeRepository.findLatestSnapshot();
    }

    // Average wait per hour of the park day. Pass null for rideName to cover every ride.
    public List<HourlyAverage> getAverageWaitByHourOfDay(String rideName) {
        return waitTimeRepository.findAverageWaitByHourOfDay(rideName).stream()
                .map(row -> new HourlyAverage(
                        ((Number) row[0]).intValue(),
                        roundToTenth(((Number) row[1]).doubleValue()),
                        ((Number) row[2]).longValue()))
                .toList();
    }

    // Average wait per day of week, Sunday first.
    public List<WeekdayAverage> getAverageWaitByDayOfWeek() {
        return waitTimeRepository.findAverageWaitByDayOfWeek().stream()
                .map(row -> {
                    int dayOfWeek = ((Number) row[0]).intValue();
                    return new WeekdayAverage(
                            dayOfWeek,
                            DAY_NAMES[dayOfWeek],
                            roundToTenth(((Number) row[1]).doubleValue()),
                            ((Number) row[2]).longValue());
                })
                .toList();
    }

    /*
     * Postgres hands back AVG as numeric and EXTRACT as numeric, so both arrive as
     * BigDecimal while COUNT arrives as Long. Reading them through Number keeps the
     * mapping working regardless of which concrete type the driver picks.
     */
    private static double roundToTenth(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    // Save a new wait time snapshot
    public WaitTime save(WaitTime waitTime) {
        return waitTimeRepository.save(waitTime);
    }

}