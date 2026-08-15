package com.disneywaits.backend.service;

import com.disneywaits.backend.model.WaitTime;
import com.disneywaits.backend.repository.WaitTimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WaitTimeService {

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

    // Save a new wait time snapshot
    public WaitTime save(WaitTime waitTime) {
        return waitTimeRepository.save(waitTime);
    }

}