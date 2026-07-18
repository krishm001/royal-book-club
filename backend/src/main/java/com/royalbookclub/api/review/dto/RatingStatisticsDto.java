package com.royalbookclub.api.review.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

/**
 * Data Transfer Object for carrying rating statistics for the overall site and book checkout experiences.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingStatisticsDto {
    private Double averageSiteRating;
    private Integer totalSiteReviews;
    private Map<Integer, Integer> siteRatingCounts; // e.g. {1: 5, 2: 12, ...}

    private Double averageCheckoutRating;
    private Integer totalCheckoutRatings;
    private Map<Integer, Integer> checkoutRatingCounts; // e.g. {1: 2, 2: 4, ...}
}
