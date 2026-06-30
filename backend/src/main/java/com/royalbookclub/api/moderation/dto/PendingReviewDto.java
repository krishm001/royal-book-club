package com.royalbookclub.api.moderation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * Unified data transfer object representing user-generated content pending administrator approval.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingReviewDto {
    private String id;
    private String collection; // "discourses", "discourse_comments", "book_reviews"
    private String type; // "DEBATE", "CHRONICLE", "COMMENT", "REVIEW"
    private String title; // Optional: blog or book title for context
    private String content; // The text content under review
    private String authorName;
    private String authorId;
    private Instant createdAt;
    private String referenceId; // The ISBN (for book reviews) or discourseId (for comments/debate replies)
}
