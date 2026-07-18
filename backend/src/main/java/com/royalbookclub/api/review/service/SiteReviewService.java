package com.royalbookclub.api.review.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.review.dto.RatingStatisticsDto;
import com.royalbookclub.api.review.model.SiteReview;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Service
public class SiteReviewService {

    private static final Logger log = LoggerFactory.getLogger(SiteReviewService.class);
    private static final String COLLECTION_NAME = "site_reviews";
    private static final String CHECKOUTS_COLLECTION = "checkouts";

    private final Firestore firestore;

    public SiteReviewService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Submit a new site review. Starts as unapproved (approved = false) by default.
     */
    public SiteReview saveReview(SiteReview review) {
        if (review.getId() == null || review.getId().isBlank()) {
            review.setId(UUID.randomUUID().toString());
        }
        if (review.getCreatedAt() == null) {
            review.setCreatedAt(Instant.now());
        }
        if (review.getApproved() == null) {
            review.setApproved(false); // By default, moderations should be via admin (approved = false)
        }
        if (review.getPublished() == null) {
            review.setPublished(false);
        }

        log.info("Saving site review ID: {}, Approved: {}, Published: {}", review.getId(), review.getApproved(), review.getPublished());
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(review.getId());
            ApiFuture<WriteResult> writeFuture = docRef.set(siteReviewToMap(review));
            writeFuture.get();
            log.info("Successfully saved site review: {}", review.getId());
            return review;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving site review: {}", review.getId(), e);
            throw new RuntimeException("Failed to save site review", e);
        } catch (ExecutionException e) {
            log.error("Error saving site review: {}", review.getId(), e);
            throw new RuntimeException("Failed to save site review", e);
        }
    }

    /**
     * Fetch all approved reviews for the homepage.
     */
    public List<SiteReview> getApprovedReviews() {
        log.debug("Fetching published site reviews");
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("published", true)
                    .get();
            QuerySnapshot querySnapshot = query.get();
            List<SiteReview> reviews = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                SiteReview r = mapToSiteReview(doc);
                if (r != null) {
                    reviews.add(r);
                }
            }
            // Sort in memory by createdAt descending
            reviews.sort((r1, r2) -> {
                if (r1.getCreatedAt() == null || r2.getCreatedAt() == null) return 0;
                return r2.getCreatedAt().compareTo(r1.getCreatedAt());
            });
            return reviews;
        } catch (Exception e) {
            log.error("Error fetching approved site reviews", e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException("Failed to read approved site reviews", e);
        }
    }

    /**
     * Fetch all site reviews for the admin console.
     */
    public List<SiteReview> getAllReviews() {
        log.debug("Fetching all site reviews for admin console");
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME).get();
            QuerySnapshot querySnapshot = query.get();
            List<SiteReview> reviews = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                SiteReview r = mapToSiteReview(doc);
                if (r != null) {
                    reviews.add(r);
                }
            }
            // Sort in memory by createdAt descending
            reviews.sort((r1, r2) -> {
                if (r1.getCreatedAt() == null || r2.getCreatedAt() == null) return 0;
                return r2.getCreatedAt().compareTo(r1.getCreatedAt());
            });
            return reviews;
        } catch (Exception e) {
            log.error("Error fetching all site reviews", e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException("Failed to read all site reviews", e);
        }
    }

    /**
     * Fetch review by ID.
     */
    public Optional<SiteReview> getReviewById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        try {
            DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(id).get().get();
            if (doc.exists()) {
                return Optional.ofNullable(mapToSiteReview(doc));
            }
        } catch (Exception e) {
            log.error("Error reading site review by ID: {}", id, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }
        return Optional.empty();
    }

    /**
     * Approve review.
     */
    public SiteReview approveReview(String id) {
        return getReviewById(id).map(review -> {
            review.setApproved(true);
            return saveReview(review);
        }).orElseThrow(() -> new IllegalArgumentException("Site review not found with ID: " + id));
    }

    /**
     * Publish/Unpublish site review.
     */
    public SiteReview publishReview(String id, boolean publish) {
        return getReviewById(id).map(review -> {
            review.setApproved(true); // Publishing implies approval
            review.setPublished(publish);
            return saveReview(review);
        }).orElseThrow(() -> new IllegalArgumentException("Site review not found with ID: " + id));
    }

    /**
     * Disapprove site review and move back to pending.
     */
    public SiteReview disapproveReview(String id) {
        return getReviewById(id).map(review -> {
            review.setApproved(false);
            review.setPublished(false);
            return saveReview(review);
        }).orElseThrow(() -> new IllegalArgumentException("Site review not found with ID: " + id));
    }

    /**
     * Reject and delete review.
     */
    public void deleteReview(String id) {
        log.info("Deleting site review ID: {}", id);
        try {
            firestore.collection(COLLECTION_NAME).document(id).delete().get();
        } catch (Exception e) {
            log.error("Error deleting site review: {}", id, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException("Failed to delete site review", e);
        }
    }

    /**
     * Aggregate rating statistics from site reviews and checkout experiences.
     */
    public RatingStatisticsDto getRatingStatistics() {
        log.info("Aggregating rating statistics from database");
        RatingStatisticsDto stats = new RatingStatisticsDto();

        // 1. Calculate Site Review stats
        int totalSiteReviews = 0;
        double siteRatingSum = 0.0;
        Map<Integer, Integer> siteRatingCounts = new HashMap<>();
        for (int i = 1; i <= 5; i++) siteRatingCounts.put(i, 0);

        try {
            QuerySnapshot siteReviewsSnapshot = firestore.collection(COLLECTION_NAME).get().get();
            for (DocumentSnapshot doc : siteReviewsSnapshot.getDocuments()) {
                Long ratingVal = doc.getLong("rating");
                if (ratingVal != null) {
                    int rating = ratingVal.intValue();
                    if (rating >= 1 && rating <= 5) {
                        totalSiteReviews++;
                        siteRatingSum += rating;
                        siteRatingCounts.put(rating, siteRatingCounts.get(rating) + 1);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch site reviews for stats", e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }

        stats.setTotalSiteReviews(totalSiteReviews);
        stats.setAverageSiteRating(totalSiteReviews > 0 ? (siteRatingSum / totalSiteReviews) : 0.0);
        stats.setSiteRatingCounts(siteRatingCounts);

        // 2. Calculate Checkout Experience Rating stats
        int totalCheckoutRatings = 0;
        double checkoutRatingSum = 0.0;
        Map<Integer, Integer> checkoutRatingCounts = new HashMap<>();
        for (int i = 1; i <= 5; i++) checkoutRatingCounts.put(i, 0);

        try {
            QuerySnapshot checkoutsSnapshot = firestore.collection(CHECKOUTS_COLLECTION).get().get();
            for (DocumentSnapshot doc : checkoutsSnapshot.getDocuments()) {
                Long ratingVal = doc.getLong("experienceRating");
                if (ratingVal != null) {
                    int rating = ratingVal.intValue();
                    if (rating >= 1 && rating <= 5) {
                        totalCheckoutRatings++;
                        checkoutRatingSum += rating;
                        checkoutRatingCounts.put(rating, checkoutRatingCounts.get(rating) + 1);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch checkouts for stats", e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }

        stats.setTotalCheckoutRatings(totalCheckoutRatings);
        stats.setAverageCheckoutRating(totalCheckoutRatings > 0 ? (checkoutRatingSum / totalCheckoutRatings) : 0.0);
        stats.setCheckoutRatingCounts(checkoutRatingCounts);

        return stats;
    }

    private Map<String, Object> siteReviewToMap(SiteReview review) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", review.getId());
        map.put("userId", review.getUserId());
        map.put("userName", review.getUserName());
        map.put("userEmail", review.getUserEmail());
        map.put("comment", review.getComment());
        map.put("rating", review.getRating());
        map.put("approved", review.getApproved() != null ? review.getApproved() : false);
        map.put("published", review.getPublished() != null ? review.getPublished() : false);
        map.put("createdAt", review.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(review.getCreatedAt().getEpochSecond(), review.getCreatedAt().getNano()) : null);
        return map;
    }

    private SiteReview mapToSiteReview(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");

        return SiteReview.builder()
                .id(doc.getString("id"))
                .userId(doc.getString("userId"))
                .userName(doc.getString("userName"))
                .userEmail(doc.getString("userEmail"))
                .comment(doc.getString("comment"))
                .rating(doc.getLong("rating") != null ? doc.getLong("rating").intValue() : null)
                .approved(doc.contains("approved") ? doc.getBoolean("approved") : false)
                .published(doc.contains("published") ? doc.getBoolean("published") : false)
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .build();
    }
}
