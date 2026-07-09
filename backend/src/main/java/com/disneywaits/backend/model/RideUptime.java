package com.disneywaits.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.math.BigDecimal;

@Entity
@Table(name = "ride_uptime")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(RideUptime.RideUptimeId.class)
public class RideUptime {

    @Id
    @Column(name = "park_id")
    private Integer parkId;

    @Id
    @Column(name = "ride_name", length = 255)
    private String rideName;

    @Id
    @Column(name = "window", length = 20)
    private String window;

    @Column(name = "uptime_percentage", nullable = false)
    private BigDecimal uptimePercentage;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RideUptimeId implements Serializable {
        private Integer parkId;
        private String rideName;
        private String window;
    }
}
