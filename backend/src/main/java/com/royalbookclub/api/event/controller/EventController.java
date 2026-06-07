package com.royalbookclub.api.event.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.event.model.Event;
import com.royalbookclub.api.event.service.EventService;
import com.royalbookclub.api.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public and member REST Controller for events.
 */
@RestController
@RequestMapping("/api/v1/events")
@Tag(name = "Events & Gatherings", description = "Endpoints to browse and register/RSVP for salon meetups and litfests")
public class EventController {

    private static final Logger log = LoggerFactory.getLogger(EventController.class);

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    /**
     * Get all events in the system.
     */
    @GetMapping
    @Operation(summary = "Get all events", description = "Retrieve list of all registered meetups and gatherings.")
    public ResponseEntity<ApiResponse<List<Event>>> getAllEvents() {
        log.debug("GET request for all events");
        List<Event> events = eventService.getAllEvents();
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    /**
     * Get a specific event by ID.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get event by ID", description = "Fetch complete metadata for an event by ID.")
    public ResponseEntity<ApiResponse<Event>> getEventById(@PathVariable String id) {
        log.debug("GET request for event ID: {}", id);
        return eventService.getEventById(id)
                .map(event -> ResponseEntity.ok(ApiResponse.success(event)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * RSVP to an event.
     */
    @PostMapping("/{id}/rsvp")
    @Operation(summary = "RSVP to event", description = "Add currently authenticated member to the event registration list.")
    public ResponseEntity<ApiResponse<Event>> rsvpToEvent(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Authentication required to RSVP"));
        }
        log.info("User {} is RSVPing to event {}", user.getId(), id);
        try {
            Event updatedEvent = eventService.rsvpUser(id, user.getId());
            return ResponseEntity.ok(ApiResponse.success(updatedEvent, "Successfully RSVP'd for this gathering"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Cancel RSVP from an event.
     */
    @DeleteMapping("/{id}/rsvp")
    @Operation(summary = "Cancel RSVP", description = "Remove currently authenticated member from the event registration list.")
    public ResponseEntity<ApiResponse<Event>> cancelRsvpToEvent(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Authentication required to cancel RSVP"));
        }
        log.info("User {} is canceling RSVP to event {}", user.getId(), id);
        try {
            Event updatedEvent = eventService.cancelRsvpUser(id, user.getId());
            return ResponseEntity.ok(ApiResponse.success(updatedEvent, "Successfully cancelled RSVP"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
