package com.royalbookclub.api.discourse.controller;

import com.royalbookclub.api.common.dto.ApiResponse;
import com.royalbookclub.api.discourse.model.BlogGenre;
import com.royalbookclub.api.discourse.service.BlogGenreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for administering Blog Salon Houses (Genres/Categories).
 */
@RestController
@RequestMapping("/api/v1/admin/genres/blogs")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Blog Genres (Houses)", description = "Administrative endpoints to create and delete blog salon houses")
public class AdminBlogGenreController {

    private static final Logger log = LoggerFactory.getLogger(AdminBlogGenreController.class);

    private final BlogGenreService blogGenreService;

    public AdminBlogGenreController(BlogGenreService blogGenreService) {
        this.blogGenreService = blogGenreService;
    }

    /**
     * Add a Blog Salon House.
     */
    @PostMapping
    @Operation(summary = "Add Blog Salon House", description = "Insert a new Blog Salon House (genre) for blog scribes.")
    public ResponseEntity<ApiResponse<BlogGenre>> saveGenre(@RequestBody BlogGenre genre) {
        log.info("Admin request to add Blog House: {}", genre.getName());
        if (genre.getName() == null || genre.getName().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("House name cannot be empty"));
        }
        BlogGenre saved = blogGenreService.saveGenre(genre);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(saved, "Salon House created successfully"));
    }

    /**
     * Delete a Blog Salon House.
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete Blog Salon House", description = "Deletes an existing Blog Salon House.")
    public ResponseEntity<ApiResponse<Void>> deleteGenre(@PathVariable String id) {
        log.info("Admin request to delete Blog House with ID: {}", id);
        blogGenreService.deleteGenre(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Salon House deleted successfully"));
    }
}
