package com.royalbookclub.api.poll.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.poll.model.Poll;
import com.royalbookclub.api.poll.service.PollService;
import com.royalbookclub.api.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public REST Controller for checking current Active Poll and casting votes.
 */
@RestController
@RequestMapping("/api/v1/public/polls")
@Tag(name = "Guild Plebiscites", description = "Public & Member endpoints to fetch active polls and register votes")
public class PollController {

    private static final Logger log = LoggerFactory.getLogger(PollController.class);

    private final PollService pollService;

    public PollController(PollService pollService) {
        this.pollService = pollService;
    }

    /**
     * Fetch the active poll.
     */
    @GetMapping("/active")
    @Operation(summary = "Get active Guild Plebiscite", description = "Retrieve the currently active community book poll or discussion plebiscite.")
    public ResponseEntity<ApiResponse<Poll>> getActivePoll() {
        log.debug("GET request for active poll");
        Poll activePoll = pollService.getActivePoll();
        return ResponseEntity.ok(ApiResponse.success(activePoll));
    }

    /**
     * Cast vote on active poll option.
     */
    @PutMapping("/{id}/vote")
    @Operation(summary = "Cast vote on plebiscite", description = "Register a vote for a specific option index (0-3). Evaluates standard membership if the poll is gated.")
    public ResponseEntity<ApiResponse<Void>> vote(
            @PathVariable String id,
            @RequestParam int optionIndex,
            @AuthenticationPrincipal User user) {
        log.info("Request to cast vote on poll ID {} for option index {}", id, optionIndex);
        pollService.vote(id, optionIndex, user);
        return ResponseEntity.ok(ApiResponse.success(null, "Your vote has been counted in the Scribes ledger"));
    }
}
