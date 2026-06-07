package com.royalbookclub.api.book.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.book.model.BookGenre;
import com.royalbookclub.api.book.service.BookGenreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST Controller for retrieving Book Salon Houses.
 */
@RestController
@RequestMapping("/api/v1/genres/books")
@Tag(name = "Book Genres (Houses)", description = "Public endpoints to fetch book salon houses (genres)")
public class BookGenreController {

    private static final Logger log = LoggerFactory.getLogger(BookGenreController.class);

    private final BookGenreService bookGenreService;

    public BookGenreController(BookGenreService bookGenreService) {
        this.bookGenreService = bookGenreService;
    }

    /**
     * Get all book salon houses.
     */
    @GetMapping
    @Operation(summary = "Get all Book Houses", description = "Retrieve list of all active Book Salon Houses (genres).")
    public ResponseEntity<ApiResponse<List<BookGenre>>> getAllGenres() {
        log.debug("GET request for all book houses/genres");
        List<BookGenre> genres = bookGenreService.getAllGenres();
        return ResponseEntity.ok(ApiResponse.success(genres));
    }
}
