package com.royalbookclub.api.review.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.moderation.service.ContentModerationService;
import com.royalbookclub.api.review.dto.RatingStatisticsDto;
import com.royalbookclub.api.review.model.SiteReview;
import com.royalbookclub.api.review.service.SiteReviewService;
import com.royalbookclub.api.user.model.Role;
import com.royalbookclub.api.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Site Reviews", description = "Endpoints for platform feedback, reviews, ratings, and admin moderation")
public class SiteReviewController {

    private static final Logger log = LoggerFactory.getLogger(SiteReviewController.class);

    private final SiteReviewService siteReviewService;
    private final ContentModerationService moderationService;

    public SiteReviewController(SiteReviewService siteReviewService, ContentModerationService moderationService) {
        this.siteReviewService = siteReviewService;
        this.moderationService = moderationService;
    }

    /**
     * Public endpoint to get all approved site reviews for the homepage.
     */
    @GetMapping("/site-reviews")
    @Operation(summary = "Get approved site reviews", description = "Fetch all approved platform comments and ratings for the homepage.")
    public ResponseEntity<ApiResponse<List<SiteReview>>> getApprovedReviews() {
        log.debug("GET request for approved site reviews");
        List<SiteReview> reviews = siteReviewService.getApprovedReviews();
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }

    /**
     * Public/Member endpoint to submit a new site review.
     */
    @PostMapping("/site-reviews")
    @Operation(summary = "Submit a site review", description = "Post a platform comment and rating. Runs through automated checks, then waits for admin approval.")
    public ResponseEntity<ApiResponse<SiteReview>> submitReview(
            @RequestBody SiteReview review,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to submit reviews"));
        }

        log.info("User {} is submitting a site review", user.getId());
        if (review.getComment() == null || review.getComment().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Review comment cannot be empty"));
        }
        if (review.getRating() == null || review.getRating() < 1 || review.getRating() > 5) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Rating must be between 1 and 5 stars"));
        }

        // Run through dual-layer automated moderation first to block profanity or spam immediately
        boolean passedAutoModeration = moderationService.moderateText(review.getComment(), user.getId(), user.getEmail(), "SITE_REVIEW");
        if (!passedAutoModeration) {
            log.warn("Site review from user {} failed automated moderation checks", user.getId());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error("Your review contains content flagged by our automated moderation guidelines."));
        }

        // Fill user details from principal to keep submissions genuine
        review.setUserId(user.getId());
        review.setUserName(user.getFullName());
        review.setUserEmail(user.getEmail());
        review.setApproved(false); // By default, moderations should be via admin (starts as false)

        SiteReview saved = siteReviewService.saveReview(review);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved, "Thank you! Your feedback has been submitted and is pending curator review."));
    }

    /**
     * Admin endpoint to get all site reviews.
     */
    @GetMapping("/admin/site-reviews")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all site reviews", description = "Admin only. Retrieve all approved and pending site reviews.")
    public ResponseEntity<ApiResponse<List<SiteReview>>> getAllReviews(@AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is fetching all site reviews", user.getId());
        List<SiteReview> reviews = siteReviewService.getAllReviews();
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }

    /**
     * Admin endpoint to approve a site review.
     */
    @PostMapping("/admin/site-reviews/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Approve site review", description = "Admin only. Approves a site review (leaves it hidden by default).")
    public ResponseEntity<ApiResponse<SiteReview>> approveReview(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is approving site review ID: {}", user.getId(), id);
        try {
            SiteReview approved = siteReviewService.publishReview(id, false); // approve but keep unpublished
            return ResponseEntity.ok(ApiResponse.success(approved, "Site review successfully approved (hidden from main page)."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Admin endpoint to publish a site review to the main page.
     */
    @PostMapping("/admin/site-reviews/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Publish site review", description = "Admin only. Approves and publishes a site review to the main page.")
    public ResponseEntity<ApiResponse<SiteReview>> publishReview(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is publishing site review ID: {}", user.getId(), id);
        try {
            SiteReview published = siteReviewService.publishReview(id, true);
            return ResponseEntity.ok(ApiResponse.success(published, "Site review successfully published to the main page."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Admin endpoint to unpublish a site review.
     */
    @PostMapping("/admin/site-reviews/{id}/unpublish")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Unpublish site review", description = "Admin only. Unpublishes a site review so it disappears from the main page.")
    public ResponseEntity<ApiResponse<SiteReview>> unpublishReview(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is unpublishing site review ID: {}", user.getId(), id);
        try {
            SiteReview unpublished = siteReviewService.publishReview(id, false);
            return ResponseEntity.ok(ApiResponse.success(unpublished, "Site review successfully unpublished from the main page."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Admin endpoint to disapprove a site review and move it back to pending.
     */
    @PostMapping("/admin/site-reviews/{id}/disapprove")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Disapprove site review", description = "Admin only. Revokes approval, unpublishes the review, and returns it to the pending queue.")
    public ResponseEntity<ApiResponse<SiteReview>> disapproveReview(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is disapproving site review ID: {}", user.getId(), id);
        try {
            SiteReview pending = siteReviewService.disapproveReview(id);
            return ResponseEntity.ok(ApiResponse.success(pending, "Site review has been disapproved and returned to the pending queue."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Admin endpoint to reject/delete a site review (POST handler).
     */
    @PostMapping("/admin/site-reviews/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reject site review (POST)", description = "Admin only. Rejects and deletes a site review from the system.")
    public ResponseEntity<ApiResponse<Void>> rejectReviewPost(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is rejecting site review ID: {}", user.getId(), id);
        try {
            siteReviewService.deleteReview(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Site review successfully rejected and removed."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Admin endpoint to reject/delete a site review (DELETE handler).
     */
    @DeleteMapping("/admin/site-reviews/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete site review (DELETE)", description = "Admin only. Deletes a site review from the system completely.")
    public ResponseEntity<ApiResponse<Void>> rejectReviewDelete(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is deleting site review ID (DELETE): {}", user.getId(), id);
        try {
            siteReviewService.deleteReview(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Site review successfully deleted."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Admin endpoint to view rating statistics.
     */
    @GetMapping("/admin/rating-statistics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform rating statistics", description = "Admin only. Aggregates and calculates statistics for site reviews and checkout experiences.")
    public ResponseEntity<ApiResponse<RatingStatisticsDto>> getRatingStatistics(@AuthenticationPrincipal User user) {
        if (user == null || user.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Curator permissions required"));
        }
        log.info("Admin {} is fetching platform rating statistics", user.getId());
        RatingStatisticsDto statistics = siteReviewService.getRatingStatistics();
        return ResponseEntity.ok(ApiResponse.success(statistics));
    }
}
