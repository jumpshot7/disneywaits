package com.disneywaits.backend.dto;

/**
 * Average wait for a single hour of the park's day, in Eastern (park local) time.
 *
 * @param hour        0-23, park local time
 * @param avgWait     mean wait in minutes across every open-ride observation in this hour
 * @param sampleCount number of ride observations behind the average — sampling is uneven,
 *                    so this is surfaced to the UI rather than hidden
 */
public record HourlyAverage(int hour, double avgWait, long sampleCount) {
}
