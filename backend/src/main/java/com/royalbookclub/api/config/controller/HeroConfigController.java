package com.royalbookclub.api.config.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.config.model.HeroConfig;
import com.royalbookclub.api.config.service.HeroConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for managing the home page hero content.
 */
@RestController
@Tag(name = "Home Hero Config", description = "Endpoints to fetch and edit the customizable home hero banner")
public class HeroConfigController {

    private static final Logger log = LoggerFactory.getLogger(HeroConfigController.class);

    private final HeroConfigService heroConfigService;

    public HeroConfigController(HeroConfigService heroConfigService) {
        this.heroConfigService = heroConfigService;
    }

    /**
     * Get the active home hero configuration.
     * Accessible publicly.
     */
    @GetMapping("/api/v1/public/hero")
    @Operation(summary = "Get Home Hero configuration", description = "Fetch the active title, subtitle, and cover flyer URL for the homepage hero section.")
    public ResponseEntity<ApiResponse<HeroConfig>> getHeroConfig() {
        log.debug("GET request for Home Hero settings");
        HeroConfig config = heroConfigService.getHeroConfig();
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    /**
     * Save or update the home hero configuration.
     * Restricted to ADMINISTRATORs only.
     */
    @PostMapping("/api/v1/admin/hero")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update Home Hero configuration", description = "Modify the active homepage hero content and background. Admin only.")
    public ResponseEntity<ApiResponse<HeroConfig>> updateHeroConfig(@RequestBody HeroConfig config) {
        log.info("Admin request to update Home Hero configuration");
        HeroConfig saved = heroConfigService.saveHeroConfig(config);
        return ResponseEntity.ok(ApiResponse.success(saved, "Hero section configurations updated successfully"));
    }

    /**
     * Reset/Delete the home hero configuration.
     * Restricted to ADMINISTRATORs only.
     */
    @DeleteMapping("/api/v1/admin/hero")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reset/Delete Home Hero configuration", description = "Delete the customized homepage hero, falling back to default theme styling. Admin only.")
    public ResponseEntity<ApiResponse<Void>> deleteHeroConfig() {
        log.info("Admin request to delete Home Hero configuration");
        heroConfigService.deleteHeroConfig();
        return ResponseEntity.ok(ApiResponse.success(null, "Hero section configurations reset successfully"));
    }
}
