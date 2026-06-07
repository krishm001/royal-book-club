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
        review.setAuthor(user.getFirstName() + " " + user.getLastName());

        BookReview savedReview = bookReviewService.saveReview(review);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(savedReview, "Review published successfully"));
    }
}
