package com.royalbookclub.api.poll.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.poll.dto.PollDto;
import com.royalbookclub.api.poll.model.Poll;
import com.royalbookclub.api.poll.service.PollService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST Controller for curator-level administration of Guild Plebiscites.
 */
@RestController
@RequestMapping("/api/v1/admin/polls")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Curator Guild Plebiscites", description = "Admin endpoints to create polls, fetch full history, and reactivate archived entries")
public class AdminPollController {

    private static final Logger log = LoggerFactory.getLogger(AdminPollController.class);

    private final PollService pollService;

    public AdminPollController(PollService pollService) {
        this.pollService = pollService;
    }

    /**
     * Define and publish a new active poll.
     */
    @PostMapping
    @Operation(summary = "Publish new Guild Plebiscite", description = "Create and deploy a new community poll. Automatically deactivates the current active poll. Curator only.")
    public ResponseEntity<ApiResponse<Poll>> createPoll(@Valid @RequestBody PollDto pollDto) {
        log.info("Admin request to create a new poll");
        Poll created = pollService.createPoll(pollDto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Plebiscite created and set as active in the Guild Entrance Hall"));
    }

    /**
     * Fetch complete history of past polls.
     */
    @GetMapping("/history")
    @Operation(summary = "List historical plebiscites", description = "Query all existing and historical polls in descending order. Curator only.")
    public ResponseEntity<ApiResponse<List<Poll>>> getPollHistory() {
        log.debug("Admin request to fetch all polls history");
        List<Poll> history = pollService.getPollHistory();
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    /**
     * Reactivate an archived past poll.
     */
    @PutMapping("/{id}/activate")
    @Operation(summary = "Reactivate historical plebiscite", description = "Set a past poll back to active, deactivating the current active one. Curator only.")
    public ResponseEntity<ApiResponse<Poll>> activatePoll(@PathVariable String id) {
        log.info("Admin request to reactivate poll with ID: {}", id);
        Poll activated = pollService.activatePoll(id);
        return ResponseEntity.ok(ApiResponse.success(activated, "Archived plebiscite is now active in the Guild Entrance Hall"));
    }
}
