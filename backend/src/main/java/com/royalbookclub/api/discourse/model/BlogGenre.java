package com.royalbookclub.api.discourse.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Model representing a Blog Salon House (Category/Genre).
 * Maps to the "blog_genres" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogGenre {
    private String id; // document ID, usually name
    private String name; // display name, e.g. "Symbolist Theses"

    @Builder.Default
    private Map<String, Map<String, Object>> translations = new HashMap<>();
}
