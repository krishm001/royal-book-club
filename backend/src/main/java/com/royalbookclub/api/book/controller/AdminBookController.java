package com.royalbookclub.api.book.controller;

import com.royalbookclub.api.book.dto.BookDto;
import com.royalbookclub.api.book.dto.BulkUploadProgressDto;
import com.royalbookclub.api.book.model.Book;
import com.royalbookclub.api.book.service.BookService;
import com.royalbookclub.api.book.service.BulkUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * REST Controller for book catalog administration.
 */
@RestController
@RequestMapping("/api/v1/admin/books")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Books Catalog", description = "Administrative endpoints to create, modify, delete, and bulk import books.")
public class AdminBookController {

    private static final Logger log = LoggerFactory.getLogger(AdminBookController.class);

    private final BookService bookService;
    private final BulkUploadService bulkUploadService;

    public AdminBookController(BookService bookService, BulkUploadService bulkUploadService) {
        this.bookService = bookService;
        this.bulkUploadService = bulkUploadService;
    }

    /**
     * Manual creation or update of a catalog book.
     */
    @PostMapping
    @Operation(summary = "Add or update a book manually", description = "Inserts a new book or overwrites existing fields. Calculates available copies automatically if total changes.")
    public ResponseEntity<Book> addOrUpdateBook(@Valid @RequestBody BookDto bookDto) {
        Book savedBook = bookService.createOrUpdateBook(bookDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedBook);
    }

    /**
     * Delete a book from catalog.
     */
    @DeleteMapping("/{isbn}")
    @Operation(summary = "Delete a book from catalog", description = "Removes a book completely from the Firestore collection.")
    public ResponseEntity<Void> deleteBook(@PathVariable String isbn) {
        bookService.deleteBook(isbn);
        return ResponseEntity.noContent().build();
    }

    /**
     * Bulk upload catalog spreadsheet (CSV or Excel).
     */
    @PostMapping(value = "/bulk-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Bulk upload catalog spreadsheet", description = "Processes catalog Excel/CSV sheets asynchronously. Returns a batch ID for tracking progress.")
    public ResponseEntity<Map<String, String>> bulkUploadCatalog(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Uploaded file is empty"));
        }

        try {
            byte[] bytes = file.getBytes();
            String fileName = file.getOriginalFilename();
            String contentType = file.getContentType();
            
            log.info("Received bulk upload request for file: {}, Content-Type: {}", fileName, contentType);
            String batchId = bulkUploadService.startUpload(fileName, bytes, contentType);
            
            return ResponseEntity.accepted().body(Map.of(
                    "batchId", batchId,
                    "message", "File upload accepted. Processing in the background."
            ));
        } catch (IOException e) {
            log.error("Failed to read bulk upload file bytes", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process uploaded file: " + e.getMessage()));
        }
    }

    /**
     * Check progress of bulk upload batch.
     */
    @GetMapping("/bulk-upload/progress/{batchId}")
    @Operation(summary = "Track bulk upload progress", description = "Returns progress, counts of success/failures, and row-level parse errors.")
    public ResponseEntity<BulkUploadProgressDto> getBulkUploadProgress(@PathVariable String batchId) {
        return bulkUploadService.getProgress(batchId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Pair or bind an NTAG UID to an existing book's ISBN.
     */
    @PostMapping("/pair")
    @Operation(summary = "Pair an NTAG UID to a book ISBN", description = "Updates the Ntag UID mapping for an existing volume in the catalog.")
    public ResponseEntity<Book> pairNtagUid(@RequestParam String isbn, @RequestParam String ntagUid) {
        try {
            Book updatedBook = bookService.bindNtagUid(isbn, ntagUid);
            return ResponseEntity.ok(updatedBook);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
