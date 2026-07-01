package com.royalbookclub.api.poll.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Model representing a Guild Plebiscite (Poll) in Google Cloud Firestore.
 * Maps to the "polls" collection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Poll {
    private String id;
    private String question;
    
    @Builder.Default
    private List<String> options = new ArrayList<>(); // Contains exactly 4 options
    
    @Builder.Default
    private List<Integer> votes = new ArrayList<>(); // Contains exactly 4 aggregated counts
    
    private boolean active;
    private boolean membersOnly;
    private Instant createdAt;

    @Builder.Default
    private Map<String, Map<String, Object>> translations = new HashMap<>();
}
