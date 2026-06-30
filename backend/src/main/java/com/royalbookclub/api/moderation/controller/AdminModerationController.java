package com.royalbookclub.api.moderation.controller;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.moderation.dto.PendingReviewDto;
import com.royalbookclub.api.moderation.model.BlockedContent;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/v1/admin/moderation")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Content Moderation Admin", description = "Endpoints for administrators to review blocked logs or pending content")
public class AdminModerationController {

    private static final Logger log = LoggerFactory.getLogger(AdminModerationController.class);
    private final Firestore firestore;

    public AdminModerationController(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Fetch all blocked content records from Firestore.
     */
    @GetMapping("/blocked")
    @Operation(summary = "Get blocked content logs (Admin only)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<BlockedContent>>> getBlockedContents() {
        log.info("Admin request to fetch all blocked content logs");
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection("blocked_contents").get();
            List<QueryDocumentSnapshot> docs = future.get().getDocuments();
            List<BlockedContent> list = new ArrayList<>();
            for (DocumentSnapshot doc : docs) {
                com.google.cloud.Timestamp blockedTimestamp = doc.getTimestamp("blockedAt");
                list.add(BlockedContent.builder()
                        .id(doc.getString("id"))
                        .contentType(doc.getString("contentType"))
                        .content(doc.getString("content"))
                        .reason(doc.getString("reason"))
                        .userId(doc.getString("userId"))
                        .userEmail(doc.getString("userEmail"))
                        .blockedAt(blockedTimestamp != null ? Instant.ofEpochSecond(blockedTimestamp.getSeconds(), blockedTimestamp.getNanos()) : null)
                        .build());
            }
            // Sort by blockedAt descending
            list.sort((a, b) -> {
                if (a.getBlockedAt() == null || b.getBlockedAt() == null) return 0;
                return b.getBlockedAt().compareTo(a.getBlockedAt());
            });
            return ResponseEntity.ok(ApiResponse.success(list));
        } catch (Exception e) {
            log.error("Failed to fetch blocked content logs", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch blocked contents: " + e.getMessage()));
        }
    }

    /**
     * Clear all blocked content records.
     */
    @DeleteMapping("/blocked")
    @Operation(summary = "Clear all blocked content logs (Admin only)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> clearBlockedContents() {
        log.info("Admin request to delete/clear blocked contents ledger");
        try {
            CollectionReference coll = firestore.collection("blocked_contents");
            ApiFuture<QuerySnapshot> future = coll.get();
            List<QueryDocumentSnapshot> docs = future.get().getDocuments();
            for (DocumentSnapshot doc : docs) {
                coll.document(doc.getId()).delete();
            }
            return ResponseEntity.ok(ApiResponse.success(null, "Blocked content ledger cleared successfully"));
        } catch (Exception e) {
            log.error("Failed to clear blocked content logs", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to clear blocked content: " + e.getMessage()));
        }
    }

    /**
     * Fetch all user-generated content pending review.
     */
    @GetMapping("/reviews")
    @Operation(summary = "Get all contents pending approval (Admin only)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<List<PendingReviewDto>>> getPendingReviews() {
        log.info("Admin request to fetch all items pending review");
        List<PendingReviewDto> pendingList = new ArrayList<>();
        try {
            // 1. Check Discourses (blogs / debates / replies)
            Query discoursesQuery = firestore.collection("discourses").whereEqualTo("approved", false);
            for (DocumentSnapshot doc : discoursesQuery.get().get().getDocuments()) {
                com.google.cloud.Timestamp ts = doc.getTimestamp("createdAt");
                pendingList.add(PendingReviewDto.builder()
                        .id(doc.getId())
                        .collection("discourses")
                        .type(doc.getString("type"))
                        .title(doc.getString("title") != null ? doc.getString("title") : doc.getString("type"))
                        .content(doc.getString("content"))
                        .authorName(doc.getString("authorName") != null ? doc.getString("authorName") : "Unknown Patron")
                        .authorId(doc.getString("authorId"))
                        .createdAt(ts != null ? Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos()) : Instant.now())
                        .referenceId(doc.getString("parentId"))
                        .build());
            }

            // 2. Check Chronicle Comments
            Query commentsQuery = firestore.collection("discourse_comments").whereEqualTo("approved", false);
            for (DocumentSnapshot doc : commentsQuery.get().get().getDocuments()) {
                com.google.cloud.Timestamp ts = doc.getTimestamp("createdAt");
                pendingList.add(PendingReviewDto.builder()
                        .id(doc.getId())
                        .collection("discourse_comments")
                        .type("COMMENT")
                        .title("Blog Comment")
                        .content(doc.getString("content"))
                        .authorName(doc.getString("authorName") != null ? doc.getString("authorName") : "Unknown Patron")
                        .authorId(doc.getString("authorId"))
                        .createdAt(ts != null ? Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos()) : Instant.now())
                        .referenceId(doc.getString("discourseId"))
                        .build());
            }

            // 3. Check Book Reviews
            Query reviewsQuery = firestore.collection("book_reviews").whereEqualTo("approved", false);
            for (DocumentSnapshot doc : reviewsQuery.get().get().getDocuments()) {
                com.google.cloud.Timestamp ts = doc.getTimestamp("createdAt");
                pendingList.add(PendingReviewDto.builder()
                        .id(doc.getId())
                        .collection("book_reviews")
                        .type("REVIEW")
                        .title("Book Review")
                        .content(doc.getString("content"))
                        .authorName(doc.getString("author") != null ? doc.getString("author") : "Unknown Patron")
                        .authorId(doc.getString("userId"))
                        .createdAt(ts != null ? Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos()) : Instant.now())
                        .referenceId(doc.getString("isbn"))
                        .build());
            }

            // Sort by createdAt descending
            pendingList.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
            return ResponseEntity.ok(ApiResponse.success(pendingList));
        } catch (Exception e) {
            log.error("Failed to query pending content from Firestore", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch pending reviews: " + e.getMessage()));
        }
    }

    /**
     * Approve a pending review item.
     */
    @PutMapping("/reviews/{collection}/{id}/approve")
    @Operation(summary = "Approve a pending review item (Admin only)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> approveReview(
            @PathVariable String collection,
            @PathVariable String id) {
        log.info("Admin request to approve item. Collection: {}, ID: {}", collection, id);
        if (!List.of("discourses", "discourse_comments", "book_reviews").contains(collection.toLowerCase())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid collection specified."));
        }
        try {
            DocumentReference docRef = firestore.collection(collection).document(id);
            DocumentSnapshot doc = docRef.get().get();
            if (!doc.exists()) {
                return ResponseEntity.notFound().build();
            }
            docRef.update("approved", true).get();
            return ResponseEntity.ok(ApiResponse.success(null, "Content approved and published successfully."));
        } catch (Exception e) {
            log.error("Failed to approve item", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to approve content: " + e.getMessage()));
        }
    }

    /**
     * Reject and delete a pending review item.
     */
    @DeleteMapping("/reviews/{collection}/{id}/reject")
    @Operation(summary = "Reject/Delete a pending review item (Admin only)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> rejectReview(
            @PathVariable String collection,
            @PathVariable String id) {
        log.info("Admin request to reject/delete item. Collection: {}, ID: {}", collection, id);
        if (!List.of("discourses", "discourse_comments", "book_reviews").contains(collection.toLowerCase())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid collection specified."));
        }
        try {
            DocumentReference docRef = firestore.collection(collection).document(id);
            DocumentSnapshot doc = docRef.get().get();
            if (!doc.exists()) {
                return ResponseEntity.notFound().build();
            }
            docRef.delete().get();
            return ResponseEntity.ok(ApiResponse.success(null, "Content rejected and removed from review queue."));
        } catch (Exception e) {
            log.error("Failed to reject/delete item", e);
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to reject content: " + e.getMessage()));
        }
    }
}
