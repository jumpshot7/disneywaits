package com.disneywaits.backend.dto;

/**
 * Average wait for a single day of the week, in Eastern (park local) time.
 *
 * @param dayOfWeek   0 = Sunday through 6 = Saturday, matching Postgres EXTRACT(DOW)
 * @param dayName     human-readable name so the frontend does not re-derive it
 * @param avgWait     mean wait in minutes across every open-ride observation on this day
 * @param sampleCount number of ride observations behind the average
 */
public record WeekdayAverage(int dayOfWeek, String dayName, double avgWait, long sampleCount) {
}
