package com.royalbookclub.api.discourse.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Model representing a Discourse in the Royal Book Club.
 * Covers both Intellectual Chronicles (CHRONICLE) and Courtyard Debates (DEBATE).
 * Maps to the "discourses" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@SuppressWarnings("Lombok")
public class Discourse {
    private String id;
    private String type; // "CHRONICLE" or "DEBATE"
    private String title; // Chronicles only
    private String content; // Blog HTML or debate text
    private String authorId;
    private String authorName;
    private String authorPhotoUrl; // optional avatar
    private String coverUrl; // Chronicles only
    private String house; // Chronicle blog category / House (e.g. "Symbolist Theses")
    
    @Builder.Default
    private List<String> tags = new ArrayList<>(); // Chronicles only

    @Builder.Default
    private Map<String, List<String>> reactions = new HashMap<>(); // Reaction -> User UIDs list
    
    private String parentId; // For debate thread replies (null if root thread)
    private Instant createdAt;
    private Instant updatedAt;
}
