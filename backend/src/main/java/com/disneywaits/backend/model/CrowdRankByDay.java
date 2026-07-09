package com.disneywaits.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "crowd_rank_by_day")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(CrowdRankByDay.CrowdRankByDayId.class)
public class CrowdRankByDay {

    @Id
    @Column(name = "park_id")
    private Integer parkId;

    @Id
    @Column(name = "date")
    private LocalDate date;

    @Column(name = "actual_score")
    private BigDecimal actualScore;

    @Column(name = "predicted_score")
    private BigDecimal predictedScore;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CrowdRankByDayId implements Serializable {
        private Integer parkId;
        private LocalDate date;
    }
}
