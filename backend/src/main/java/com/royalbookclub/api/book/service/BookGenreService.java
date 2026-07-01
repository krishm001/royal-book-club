package com.royalbookclub.api.book.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.book.model.BookGenre;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage Book Salon Houses (Genres) in Firestore.
 */
@Service
public class BookGenreService {

    private static final Logger log = LoggerFactory.getLogger(BookGenreService.class);
    private static final String COLLECTION_NAME = "book_genres";

    private final Firestore firestore;

    public BookGenreService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Fetch all available book genres/houses.
     * Pre-populates default houses if none exist.
     */
    public List<BookGenre> getAllGenres() {
        log.debug("Fetching all book genres from Firestore");
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME).get();
            QuerySnapshot querySnapshot = query.get();
            List<BookGenre> genres = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                genres.add(mapToBookGenre(doc));
            }

            if (genres.isEmpty()) {
                log.info("No Book Salon Houses found. Pre-populating default aesthetic houses.");
                List<String> defaults = List.of("Gothic Literature", "Romantic Poetry", "Natural Philosophy", "Ancient Classics", "Enlightenment Essays");
                for (String d : defaults) {
                    BookGenre bg = BookGenre.builder().id(d.toLowerCase().replace(" ", "_")).name(d).build();
                    saveGenre(bg);
                    genres.add(bg);
                }
            }

            // Sort alphabetically by name
            genres.sort((g1, r2) -> g1.getName().compareToIgnoreCase(r2.getName()));
            return genres;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading book genres", e);
            throw new RuntimeException("Failed to read genres", e);
        } catch (ExecutionException e) {
            log.error("Error reading book genres", e);
            throw new RuntimeException("Failed to read genres", e);
        }
    }

    /**
     * Add a new book genre/house.
     */
    public BookGenre saveGenre(BookGenre genre) {
        String cleanName = genre.getName().trim();
        String id = cleanName.toLowerCase().replace(" ", "_");
        genre.setId(id);
        genre.setName(cleanName);

        log.info("Saving Book Salon House: {} (ID: {})", cleanName, id);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            Map<String, Object> map = new HashMap<>();
            map.put("id", id);
            map.put("name", cleanName);
            map.put("translations", genre.getTranslations() != null ? genre.getTranslations() : new HashMap<String, Map<String, Object>>());
            
            ApiFuture<WriteResult> writeFuture = docRef.set(map);
            writeFuture.get();
            log.info("Successfully saved Book Salon House: {}", id);
            return genre;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving book genre: {}", id, e);
            throw new RuntimeException("Failed to save genre", e);
        } catch (ExecutionException e) {
            log.error("Error saving book genre: {}", id, e);
            throw new RuntimeException("Failed to save genre", e);
        }
    }

    /**
     * Delete a book genre/house by name or ID.
     */
    public void deleteGenre(String nameOrId) {
        String id = nameOrId.trim().toLowerCase().replace(" ", "_");
        log.info("Deleting Book Salon House from Firestore by ID: {}", id);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            ApiFuture<WriteResult> writeFuture = docRef.delete();
            writeFuture.get();
            log.info("Successfully deleted Book Salon House: {}", id);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while deleting book genre: {}", id, e);
            throw new RuntimeException("Failed to delete genre", e);
        } catch (ExecutionException e) {
            log.error("Error deleting book genre: {}", id, e);
            throw new RuntimeException("Failed to delete genre", e);
        }
    }

    @SuppressWarnings("unchecked")
    private BookGenre mapToBookGenre(DocumentSnapshot doc) {
        if (!doc.exists()) return null;
        Map<String, Map<String, Object>> translations = (Map<String, Map<String, Object>>) doc.get("translations");
        return BookGenre.builder()
                .id(doc.getString("id"))
                .name(doc.getString("name"))
                .translations(translations != null ? translations : new HashMap<>())
                .build();
    }
}
