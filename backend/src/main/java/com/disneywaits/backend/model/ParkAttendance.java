package com.disneywaits.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Entity
@Table(name = "park_attendance")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(ParkAttendance.ParkAttendanceId.class)
public class ParkAttendance {

    @Id
    @Column(name = "park_id")
    private Integer parkId;

    @Id
    @Column(name = "year")
    private Integer year;

    @Column(name = "attendance", nullable = false)
    private Long attendance;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParkAttendanceId implements Serializable {
        private Integer parkId;
        private Integer year;
    }
}
