package com.royalbookclub.api.discourse.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;

/**
 * Model representing a comment on an Intellectual Chronicle.
 * Maps to the "discourse_comments" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@SuppressWarnings("Lombok")
public class DiscourseComment {
    private String id;
    private String discourseId; // ID of the CHRONICLE
    private String authorId;
    private String authorName;
    private String authorPhotoUrl;
    private String content;

    @Builder.Default
    private Map<String, List<String>> reactions = new HashMap<>(); // Reaction -> User UIDs list

    private Boolean approved;
    private Instant createdAt;
}
