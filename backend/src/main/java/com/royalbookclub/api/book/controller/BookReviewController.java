package com.royalbookclub.api.book.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.book.model.BookReview;
import com.royalbookclub.api.book.service.BookReviewService;
import com.royalbookclub.api.user.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for submitting and fetching comments/reviews on library books.
 */
@RestController
@RequestMapping("/api/v1/books/{isbn}/reviews")
@Tag(name = "Book Reviews", description = "Public & Member endpoints to fetch and submit book reviews or comments")
public class BookReviewController {

    private static final Logger log = LoggerFactory.getLogger(BookReviewController.class);

    private final BookReviewService bookReviewService;

    public BookReviewController(BookReviewService bookReviewService) {
        this.bookReviewService = bookReviewService;
    }

    /**
     * Get all comments/reviews for a specific book by ISBN.
     */
    @GetMapping
    @Operation(summary = "Get reviews for a book", description = "Fetch all patron dissertations, ratings, and reviews for a book.")
    public ResponseEntity<ApiResponse<List<BookReview>>> getReviews(@PathVariable String isbn) {
        log.debug("GET request for reviews on ISBN: {}", isbn);
        List<BookReview> reviews = bookReviewService.getReviewsByIsbn(isbn);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }

    /**
     * Post a comment/review on a specific book.
     */
    @PostMapping
    @Operation(summary = "Post review on a book", description = "Submit a comment/rating for a specific book. Authenticated patrons only.")
    public ResponseEntity<ApiResponse<BookReview>> submitReview(
            @PathVariable String isbn,
            @RequestBody BookReview review,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to post reviews"));
        }

        log.info("User {} is posting a review on ISBN: {}", user.getId(), isbn);
        if (review.getContent() == null || review.getContent().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Review content cannot be empty"));
        }

        // Fill user details from principal to keep data secure and genuine
        review.setIsbn(isbn);
        review.setUserId(user.getId());
        review.setAuthor(user.getFullName());

        BookReview savedReview = bookReviewService.saveReview(review);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(savedReview, "Review published successfully"));
    }

    /**
     * Update an existing book review/comment.
     */
    @PutMapping("/{reviewId}")
    @Operation(summary = "Update a book review", description = "Updates an existing book review or comment. Can only be done by the author.")
    public ResponseEntity<ApiResponse<BookReview>> updateReview(
            @PathVariable String isbn,
            @PathVariable String reviewId,
            @RequestBody BookReview updatePayload,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to update reviews"));
        }

        return bookReviewService.getReviewById(reviewId)
                .map(existing -> {
                    boolean isAuthor = user.getId().equals(existing.getUserId());
                    if (!isAuthor) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<BookReview>error("Only the author can edit this review"));
                    }

                    log.info("User {} is updating book review ID: {}", user.getId(), reviewId);
                    if (updatePayload.getContent() == null || updatePayload.getContent().isBlank()) {
                        return ResponseEntity.badRequest().body(ApiResponse.<BookReview>error("Review content cannot be empty"));
                    }

                    existing.setContent(updatePayload.getContent());
                    if (updatePayload.getRating() != null) {
                        existing.setRating(updatePayload.getRating());
                    }
                    
                    BookReview saved = bookReviewService.saveReview(existing);
                    return ResponseEntity.ok(ApiResponse.success(saved, "Review updated successfully"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete an existing book review/comment.
     */
    @DeleteMapping("/{reviewId}")
    @Operation(summary = "Delete a book review", description = "Deletes an existing book review or comment. Can only be done by the author or an ADMIN.")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable String isbn,
            @PathVariable String reviewId,
            @AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required to delete reviews"));
        }

        return bookReviewService.getReviewById(reviewId)
                .map(existing -> {
                    boolean isAuthor = user.getId().equals(existing.getUserId());
                    boolean isAdmin = user.getRole() == com.royalbookclub.api.user.model.Role.ADMIN;
                    if (!isAuthor && !isAdmin) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.<Void>error("Only the author or a Curator can delete this review"));
                    }

                    log.info("User {} is deleting book review ID: {}", user.getId(), reviewId);
                    bookReviewService.deleteReview(reviewId);
                    return ResponseEntity.ok(ApiResponse.<Void>success(null, "Review deleted successfully"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
