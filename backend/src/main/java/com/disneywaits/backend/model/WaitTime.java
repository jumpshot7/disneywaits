package com.disneywaits.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "wait_times")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WaitTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ride_name", nullable = false)
    private String rideName;

    @Column(name = "park_name", nullable = false)
    private String parkName;

    @Column(name = "wait_minutes", nullable = false)
    private Integer waitMinutes;

    @Column(name = "is_open", nullable = false)
    private Boolean isOpen;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

}