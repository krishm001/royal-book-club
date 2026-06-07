package com.royalbookclub.api.event.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.event.model.Event;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage gatherings and events in Google Cloud Firestore.
 */
@Service
public class EventService {

    private static final Logger log = LoggerFactory.getLogger(EventService.class);
    private static final String COLLECTION_NAME = "events";

    private final Firestore firestore;

    public EventService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Retrieve all events.
     */
    public List<Event> getAllEvents() {
        log.debug("Fetching all events from Firestore");
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME).get();
            QuerySnapshot querySnapshot = query.get();
            List<Event> events = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                events.add(mapToEvent(doc));
            }
            return events;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading events from Firestore", e);
            throw new RuntimeException("Failed to read events", e);
        } catch (ExecutionException e) {
            log.error("Error reading events from Firestore", e);
            throw new RuntimeException("Failed to read events", e);
        }
    }

    /**
     * Retrieve a specific event by its ID.
     */
    public Optional<Event> getEventById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        log.debug("Fetching event from Firestore by ID: {}", id);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();
            if (document.exists()) {
                return Optional.of(mapToEvent(document));
            }
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while fetching event: {}", id, e);
            throw new RuntimeException("Failed to read event", e);
        } catch (ExecutionException e) {
            log.error("Error fetching event: {}", id, e);
            throw new RuntimeException("Failed to read event", e);
        }
    }

    /**
     * Create or update an event.
     */
    public Event createOrUpdateEvent(Event event) {
        String id = event.getId();
        boolean isNew = false;
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
            event.setId(id);
            isNew = true;
        }

        log.info("Saving event with ID: {}, isNew: {}", id, isNew);
        Instant now = Instant.now();
        if (isNew) {
            event.setCreatedAt(now);
            event.setUpdatedAt(now);
        } else {
            Optional<Event> existing = getEventById(id);
            if (existing.isPresent()) {
                event.setCreatedAt(existing.get().getCreatedAt());
                // Preserve RSVPs if they are not passed or are empty in request (to avoid wiping out registrants)
                if (event.getRsvps() == null || event.getRsvps().isEmpty()) {
                    event.setRsvps(existing.get().getRsvps());
                }
            } else {
                event.setCreatedAt(now);
            }
            event.setUpdatedAt(now);
        }

        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            ApiFuture<WriteResult> writeFuture = docRef.set(eventToMap(event));
            writeFuture.get();
            log.info("Successfully saved event: {}", id);
            return event;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving event: {}", id, e);
            throw new RuntimeException("Failed to save event", e);
        } catch (ExecutionException e) {
            log.error("Error saving event: {}", id, e);
            throw new RuntimeException("Failed to save event", e);
        }
    }

    /**
     * Delete an event by ID.
     */
    public void deleteEvent(String id) {
        log.info("Deleting event from Firestore by ID: {}", id);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            ApiFuture<WriteResult> writeFuture = docRef.delete();
            writeFuture.get();
            log.info("Successfully deleted event: {}", id);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while deleting event: {}", id, e);
            throw new RuntimeException("Failed to delete event", e);
        } catch (ExecutionException e) {
            log.error("Error deleting event: {}", id, e);
            throw new RuntimeException("Failed to delete event", e);
        }
    }

    /**
     * RSVP current user to the event.
     */
    public Event rsvpUser(String eventId, String userId) {
        log.info("RSVPing user {} to event {}", userId, eventId);
        Event event = getEventById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + eventId));

        List<String> rsvps = event.getRsvps();
        if (rsvps == null) {
            rsvps = new ArrayList<>();
        }
        if (!rsvps.contains(userId)) {
            rsvps.add(userId);
            event.setRsvps(rsvps);
            return createOrUpdateEvent(event);
        }
        return event;
    }

    /**
     * Cancel RSVP for a user from an event.
     */
    public Event cancelRsvpUser(String eventId, String userId) {
        log.info("Canceling RSVP for user {} from event {}", userId, eventId);
        Event event = getEventById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + eventId));

        List<String> rsvps = event.getRsvps();
        if (rsvps != null && rsvps.contains(userId)) {
            rsvps.remove(userId);
            event.setRsvps(rsvps);
            return createOrUpdateEvent(event);
        }
        return event;
    }

    private Map<String, Object> eventToMap(Event event) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", event.getId());
        map.put("title", event.getTitle());
        map.put("description", event.getDescription());
        map.put("extendedDescription", event.getExtendedDescription());
        map.put("date", event.getDate());
        map.put("time", event.getTime());
        map.put("location", event.getLocation());
        map.put("address", event.getAddress());
        map.put("type", event.getType());
        map.put("curator", event.getCurator());
        map.put("capacity", event.getCapacity());
        map.put("imageUrl", event.getImageUrl());
        map.put("rsvps", event.getRsvps() != null ? event.getRsvps() : new ArrayList<String>());
        map.put("createdAt", event.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(event.getCreatedAt().getEpochSecond(), event.getCreatedAt().getNano()) : null);
        map.put("updatedAt", event.getUpdatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(event.getUpdatedAt().getEpochSecond(), event.getUpdatedAt().getNano()) : null);
        return map;
    }

    @SuppressWarnings("unchecked")
    private Event mapToEvent(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");
        com.google.cloud.Timestamp updatedTimestamp = doc.getTimestamp("updatedAt");
        List<String> rsvps = (List<String>) doc.get("rsvps");

        return Event.builder()
                .id(doc.getString("id"))
                .title(doc.getString("title"))
                .description(doc.getString("description"))
                .extendedDescription(doc.getString("extendedDescription"))
                .date(doc.getString("date"))
                .time(doc.getString("time"))
                .location(doc.getString("location"))
                .address(doc.getString("address"))
                .type(doc.getString("type"))
                .curator(doc.getString("curator"))
                .capacity(doc.getLong("capacity") != null ? doc.getLong("capacity").intValue() : null)
                .imageUrl(doc.getString("imageUrl"))
                .rsvps(rsvps != null ? rsvps : new ArrayList<>())
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .updatedAt(updatedTimestamp != null ? Instant.ofEpochSecond(updatedTimestamp.getSeconds(), updatedTimestamp.getNanos()) : null)
                .build();
    }
}
