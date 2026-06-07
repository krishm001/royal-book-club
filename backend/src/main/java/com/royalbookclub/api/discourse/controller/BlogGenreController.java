package com.royalbookclub.api.discourse.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.discourse.model.BlogGenre;
import com.royalbookclub.api.discourse.service.BlogGenreService;
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
 * REST Controller for retrieving Blog Salon Houses.
 */
@RestController
@RequestMapping("/api/v1/genres/blogs")
@Tag(name = "Blog Genres (Houses)", description = "Public endpoints to fetch blog salon houses (categories)")
public class BlogGenreController {

    private static final Logger log = LoggerFactory.getLogger(BlogGenreController.class);

    private final BlogGenreService blogGenreService;

    public BlogGenreController(BlogGenreService blogGenreService) {
        this.blogGenreService = blogGenreService;
    }

    /**
     * Get all blog salon houses.
     */
    @GetMapping
    @Operation(summary = "Get all Blog Houses", description = "Retrieve list of all active Blog Salon Houses (genres).")
    public ResponseEntity<ApiResponse<List<BlogGenre>>> getAllGenres() {
        log.debug("GET request for all blog houses/genres");
        List<BlogGenre> genres = blogGenreService.getAllGenres();
        return ResponseEntity.ok(ApiResponse.success(genres));
    }
}
