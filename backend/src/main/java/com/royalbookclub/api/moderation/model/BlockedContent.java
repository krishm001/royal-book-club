package com.royalbookclub.api.moderation.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * Model representing content blocked by moderation filters.
 * Mapped to the "blocked_contents" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockedContent {
    private String id;
    private String contentType; // e.g., "REVIEW", "CHRONICLE", "COMMENT", "DEBATE", "IMAGE"
    private String content; // The text content or image URL
    private String reason; // The reason why it was blocked (e.g. regex matched, simulated Google API)
    private String userId; // The ID of the submitting user
    private String userEmail; // The email of the submitting user
    private Instant blockedAt;
}
