package com.royalbookclub.api.event.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a gathering/event in the Royal Book Club.
 * Maps to the "events" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event {
    private String id;
    private String title;
    private String description;
    private String extendedDescription;
    private String date; // e.g. "2026-10-15"
    private String time; // e.g. "18:00 - 21:30"
    private String location; // Lounge, Hall, etc.
    private String address;
    private String type; // Litfest, Discussion, Meetup
    private String curator;
    private Integer capacity;
    private String imageUrl; // Flyer image URL
    
    @Builder.Default
    private List<String> rsvps = new ArrayList<>(); // User IDs of registered patrons
    
    private Instant createdAt;
    private Instant updatedAt;
}
