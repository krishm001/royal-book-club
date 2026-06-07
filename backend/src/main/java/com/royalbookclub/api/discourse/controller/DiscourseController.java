package com.royalbookclub.api.discourse.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.discourse.model.Discourse;
import com.royalbookclub.api.discourse.model.DiscourseComment;
import com.royalbookclub.api.discourse.service.DiscourseService;
import com.royalbookclub.api.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for retrieving and creating academic Discourses (Intellectual Chronicles and Courtyard Debates).
 */
@RestController
@RequestMapping("/api/v1/discourses")
@Tag(name = "Discourses & Chronicles", description = "Endpoints to publish chronicles, participate in debates, and post comments/replies")
public class DiscourseController {

    private static final Logger log = LoggerFactory.getLogger(DiscourseController.class);

    private final DiscourseService discourseService;

    public DiscourseController(DiscourseService discourseService) {
        this.discourseService = discourseService;
    }

    /**
     * Get root discourses of a specific type (CHRONICLE or DEBATE).
     */
    @GetMapping
    @Operation(summary = "Get discourses by type", description = "Retrieve list of all active Intellectual Chronicles (CHRONICLE) or root Courtyard Debates (DEBATE).")
    public ResponseEntity<ApiResponse<List<Discourse>>> getDiscourses(@RequestParam(defaultValue = "CHRONICLE") String type) {
        log.debug("GET request for discourses of type: {}", type);
        List<Discourse> list = discourseService.getRootDiscourses(type);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    /**
     * Get specific discourse details along with its comments/replies.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get discourse by ID", description = "Retrieve a chronicle or debate details. Returns a structured map containing 'discourse' and 'responses' (comments or threaded replies).")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDiscourseById(@PathVariable String id) {
        log.debug("GET request for discourse details, ID: {}", id);
        return discourseService.getDiscourseById(id)
                .map(discourse -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("discourse", discourse);

                    if ("CHRONICLE".equalsIgnoreCase(discourse.getType())) {
                        List<DiscourseComment> comments = discourseService.getChronicleComments(id);
                        data.put("responses", comments);
                    } else {
                        List<Discourse> replies = discourseService.getDebateReplies(id);
                        data.put("responses", replies);
                    }

                    return ResponseEntity.ok(ApiResponse.success(data));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Publish a new Discourse (Scribe a Chronicle or Ignite a Debate).
     */
    @PostMapping
    @Operation(summary = "Publish a discourse", description = "Publishes a new Chronicle or root Debate. Authenticated users only.")
    public ResponseEntity<ApiResponse<Discourse>> publishDiscourse(
            @RequestBody Discourse discourse,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to publish"));
        }

        log.info("User {} is publishing discourse of type {}", user.getId(), discourse.getType());
        if (discourse.getContent() == null || discourse.getContent().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Discourse content cannot be empty"));
        }

        // Fill author details
        discourse.setAuthorId(user.getId());
        discourse.setAuthorName(user.getFullName());
        discourse.setParentId(null); // Force as root

        Discourse saved = discourseService.saveDiscourse(discourse);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved, "Discourse published successfully"));
    }

    /**
     * Comment on a Chronicle.
     */
    @PostMapping("/{id}/comment")
    @Operation(summary = "Comment on a chronicle", description = "Submits a response/comment to an Intellectual Chronicle. Authenticated users only.")
    public ResponseEntity<ApiResponse<DiscourseComment>> commentOnChronicle(
            @PathVariable String id,
            @RequestBody DiscourseComment comment,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to comment"));
        }

        log.info("User {} is commenting on chronicle: {}", user.getId(), id);
        if (comment.getContent() == null || comment.getContent().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Comment content cannot be empty"));
        }

        // Setup comment properties
        comment.setDiscourseId(id);
        comment.setAuthorId(user.getId());
        comment.setAuthorName(user.getFullName());

        DiscourseComment saved = discourseService.saveChronicleComment(comment);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved, "Comment published successfully"));
    }

    /**
     * Reply to a Debate thread.
     */
    @PostMapping("/{id}/reply")
    @Operation(summary = "Reply to a debate thread", description = "Submits a reply to a Courtyard Debate. Authenticated users only.")
    public ResponseEntity<ApiResponse<Discourse>> replyToDebate(
            @PathVariable String id,
            @RequestBody Discourse reply,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to reply"));
        }

        log.info("User {} is replying to debate: {}", user.getId(), id);
        if (reply.getContent() == null || reply.getContent().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Reply content cannot be empty"));
        }

        // Setup reply properties
        reply.setType("DEBATE");
        reply.setParentId(id);
        reply.setAuthorId(user.getId());
        reply.setAuthorName(user.getFullName());

        Discourse saved = discourseService.saveDiscourse(reply);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved, "Reply posted successfully"));
    }

    /**
     * Update an existing Discourse (Chronicle or Debate).
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update a discourse", description = "Updates an existing Chronicle or Debate. Can only be done by the author or an ADMIN.")
    public ResponseEntity<ApiResponse<Discourse>> updateDiscourse(
            @PathVariable String id,
            @RequestBody Discourse updatePayload,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to update"));
        }

        return discourseService.getDiscourseById(id)
                .map(existing -> {
                    boolean isAuthor = user.getId().equals(existing.getAuthorId());
                    boolean isAdmin = user.getRole() == com.royalbookclub.api.user.model.Role.ADMIN;
                    if (!isAuthor && !isAdmin) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<Discourse>error("Only the author or a Curator can edit this discourse"));
                    }

                    log.info("User {} is updating discourse ID: {}", user.getId(), id);
                    if (updatePayload.getContent() == null || updatePayload.getContent().isBlank()) {
                        return ResponseEntity.badRequest().body(ApiResponse.<Discourse>error("Content cannot be empty"));
                    }

                    existing.setContent(updatePayload.getContent());
                    if ("CHRONICLE".equalsIgnoreCase(existing.getType())) {
                        if (updatePayload.getTitle() != null && !updatePayload.getTitle().isBlank()) {
                            existing.setTitle(updatePayload.getTitle());
                        }
                        if (updatePayload.getCoverUrl() != null) {
                            existing.setCoverUrl(updatePayload.getCoverUrl());
                        }
                        if (updatePayload.getHouse() != null && !updatePayload.getHouse().isBlank()) {
                            existing.setHouse(updatePayload.getHouse());
                        }
                        if (updatePayload.getTags() != null) {
                            existing.setTags(updatePayload.getTags());
                        }
                    }

                    Discourse saved = discourseService.saveDiscourse(existing);
                    return ResponseEntity.ok(ApiResponse.success(saved, "Discourse updated successfully"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
