package com.royalbookclub.api.stats.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.stats.dto.StatsSummaryDto;
import com.royalbookclub.api.stats.service.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller to expose public platform counters and statistics.
 */
@RestController
@RequestMapping("/api/v1/public/stats")
@Tag(name = "Platform Stats", description = "Public endpoints to retrieve library and membership dashboard counters")
public class StatsController {

    private static final Logger log = LoggerFactory.getLogger(StatsController.class);

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    /**
     * Get live summary counters for members, catalog, active checkouts, and upcoming gatherings.
     */
    @GetMapping("/summary")
    @Operation(summary = "Get platform metrics", description = "Fetch real-time aggregated counts from the database to power dashboard headers.")
    public ResponseEntity<ApiResponse<StatsSummaryDto>> getStatsSummary() {
        log.debug("GET request for live statistics summary");
        StatsSummaryDto summary = statsService.getStatsSummary();
        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
