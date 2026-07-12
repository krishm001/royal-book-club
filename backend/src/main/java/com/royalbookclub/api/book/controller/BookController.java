package com.royalbookclub.api.book.controller;

import com.royalbookclub.api.book.dto.OpenLibraryBookDto;
import com.royalbookclub.api.book.model.Book;
import com.royalbookclub.api.book.service.BookService;
import com.royalbookclub.api.book.service.IsbnLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * REST Controller for public book catalog retrieval operations.
 */
@RestController
@RequestMapping("/api/v1/books")
@Tag(name = "Books Catalog", description = "Public endpoints to browse the library catalog and search metadata")
public class BookController {

    private final BookService bookService;
    private final IsbnLookupService isbnLookupService;

    public BookController(BookService bookService, IsbnLookupService isbnLookupService) {
        this.bookService = bookService;
        this.isbnLookupService = isbnLookupService;
    }

    /**
     * Get all books in the catalog.
     */
    @GetMapping
    @Operation(summary = "Get all books in catalog", description = "Retrieve list of all registered books with total/available copy counts.")
    public ResponseEntity<List<Book>> getAllBooks() {
        return ResponseEntity.ok(bookService.getAllBooks());
    }

    /**
     * Get details of a book by ISBN.
     */
    @GetMapping("/{isbn}")
    @Operation(summary = "Get book by ISBN", description = "Fetch complete metadata for a book using its clean ISBN-10 or ISBN-13.")
    public ResponseEntity<Book> getBookByIsbn(@PathVariable String isbn) {
        return bookService.getBookByIsbn(isbn)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Fetch metadata from Open Library.
     */
    @GetMapping("/lookup/{isbn}")
    @Operation(summary = "Lookup book metadata by ISBN", description = "Query Open Library API asynchronously for book details like pages, publishers, covers, authors.")
    public Mono<ResponseEntity<OpenLibraryBookDto>> lookupOpenLibraryIsbn(@PathVariable String isbn) {
        return isbnLookupService.lookupIsbn(isbn)
                .map(ResponseEntity::ok);
    }

    /**
     * Fetch book by NTAG UID.
     */
    @GetMapping("/ntag/{uid}")
    @Operation(summary = "Get book by NTAG UID", description = "Query Firestore catalog to fetch book by physical NTAG UID.")
    public ResponseEntity<Book> getBookByNtagUid(@PathVariable String uid) {
        Book book = bookService.getBookByNtagUid(uid);
        if (book != null) {
            return ResponseEntity.ok(book);
        }
        return ResponseEntity.notFound().build();
    }
}
