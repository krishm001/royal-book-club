package com.royalbookclub.api.event.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.event.model.Event;
import com.royalbookclub.api.event.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for gathering/event administration.
 */
@RestController
@RequestMapping("/api/v1/admin/events")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Events Catalog", description = "Administrative endpoints to create, modify, and delete salon gatherings.")
public class AdminEventController {

    private static final Logger log = LoggerFactory.getLogger(AdminEventController.class);

    private final EventService eventService;

    public AdminEventController(EventService eventService) {
        this.eventService = eventService;
    }

    /**
     * Create or update an event.
     */
    @PostMapping
    @Operation(summary = "Create or update event", description = "Insert a new event or overwrite an existing one.")
    public ResponseEntity<ApiResponse<Event>> createOrUpdateEvent(@Valid @RequestBody Event event) {
        log.info("Admin request to create/update event");
        Event savedEvent = eventService.createOrUpdateEvent(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(savedEvent, "Event saved successfully"));
    }

    /**
     * Delete an event by ID.
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete event", description = "Deletes an event completely from Firestore collection.")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable String id) {
        log.info("Admin request to delete event with ID: {}", id);
        eventService.deleteEvent(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Event deleted successfully"));
    }
}
