package com.royalbookclub.api.config.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.config.model.CheckoutSettings;
import com.royalbookclub.api.config.service.CheckoutSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller to manage library checkout profile gating settings.
 */
@RestController
@Tag(name = "Checkout Settings Config", description = "Endpoints to fetch and edit the mandatory profile settings before checkouts")
public class CheckoutSettingsController {

    private static final Logger log = LoggerFactory.getLogger(CheckoutSettingsController.class);

    private final CheckoutSettingsService checkoutSettingsService;

    public CheckoutSettingsController(CheckoutSettingsService checkoutSettingsService) {
        this.checkoutSettingsService = checkoutSettingsService;
    }

    /**
     * Retrieve current checkout requirements. Public endpoint.
     */
    @GetMapping("/api/v1/public/checkout-settings")
    @Operation(summary = "Get active checkout requirements", description = "Fetch which profile fields are mandatory for checking out books.")
    public ResponseEntity<ApiResponse<CheckoutSettings>> getCheckoutSettings() {
        log.debug("GET request for checkout gating configurations");
        CheckoutSettings settings = checkoutSettingsService.getCheckoutSettings();
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    /**
     * Update checkout gating rules. Restricted to ADMINISTRATORs.
     */
    @PutMapping("/api/v1/admin/checkout-settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update checkout requirements (Admin only)", description = "Configure which registration fields are required of scholars to check out volumes.")
    public ResponseEntity<ApiResponse<CheckoutSettings>> updateCheckoutSettings(@RequestBody CheckoutSettings settings) {
        log.info("Admin request to update checkout gating rules");
        CheckoutSettings saved = checkoutSettingsService.saveCheckoutSettings(settings);
        return ResponseEntity.ok(ApiResponse.success(saved, "Self-checkout profile requirements updated successfully"));
    }
}
