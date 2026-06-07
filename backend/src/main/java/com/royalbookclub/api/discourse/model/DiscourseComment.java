package com.royalbookclub.api.discourse.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * Model representing a comment on an Intellectual Chronicle.
 * Maps to the "discourse_comments" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscourseComment {
    private String id;
    private String discourseId; // ID of the CHRONICLE
    private String authorId;
    private String authorName;
    private String authorPhotoUrl;
    private String content;
    private Instant createdAt;
}
