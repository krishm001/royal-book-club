package com.royalbookclub.api.stats.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for aggregated platform metrics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsSummaryDto {
    private long membersCount;
    private long booksCount;
    private long activeCheckoutsCount;
    private long upcomingSalonsCount;
}
