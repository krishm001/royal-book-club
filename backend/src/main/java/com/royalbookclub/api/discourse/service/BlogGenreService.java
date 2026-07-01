package com.royalbookclub.api.discourse.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.discourse.model.BlogGenre;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage Blog Salon Houses (Genres) in Firestore.
 */
@Service
public class BlogGenreService {

    private static final Logger log = LoggerFactory.getLogger(BlogGenreService.class);
    private static final String COLLECTION_NAME = "blog_genres";

    private final Firestore firestore;

    public BlogGenreService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Fetch all available blog genres/houses.
     * Pre-populates default houses if none exist.
     */
    public List<BlogGenre> getAllGenres() {
        log.debug("Fetching all blog genres from Firestore");
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COLLECTION_NAME).get();
            QuerySnapshot querySnapshot = query.get();
            List<BlogGenre> genres = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                genres.add(mapToBlogGenre(doc));
            }

            if (genres.isEmpty()) {
                log.info("No Blog Salon Houses found. Pre-populating default aesthetic houses.");
                List<String> defaults = List.of("Philosophical Inquiries", "Symbolist Theses", "Aesthetic Critiques", "Historical Chronicles", "Theological Dialogues");
                for (String d : defaults) {
                    BlogGenre bg = BlogGenre.builder().id(d.toLowerCase().replace(" ", "_")).name(d).build();
                    saveGenre(bg);
                    genres.add(bg);
                }
            }

            // Sort alphabetically by name
            genres.sort((g1, r2) -> g1.getName().compareToIgnoreCase(r2.getName()));
            return genres;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading blog genres", e);
            throw new RuntimeException("Failed to read genres", e);
        } catch (ExecutionException e) {
            log.error("Error reading blog genres", e);
            throw new RuntimeException("Failed to read genres", e);
        }
    }

    /**
     * Add a new blog genre/house.
     */
    public BlogGenre saveGenre(BlogGenre genre) {
        String cleanName = genre.getName().trim();
        String id = cleanName.toLowerCase().replace(" ", "_");
        genre.setId(id);
        genre.setName(cleanName);

        log.info("Saving Blog Salon House: {} (ID: {})", cleanName, id);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            Map<String, Object> map = new HashMap<>();
            map.put("id", id);
            map.put("name", cleanName);
            map.put("translations", genre.getTranslations() != null ? genre.getTranslations() : new HashMap<String, Map<String, Object>>());
            
            ApiFuture<WriteResult> writeFuture = docRef.set(map);
            writeFuture.get();
            log.info("Successfully saved Blog Salon House: {}", id);
            return genre;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving blog genre: {}", id, e);
            throw new RuntimeException("Failed to save genre", e);
        } catch (ExecutionException e) {
            log.error("Error saving blog genre: {}", id, e);
            throw new RuntimeException("Failed to save genre", e);
        }
    }

    /**
     * Delete a blog genre/house by name or ID.
     */
    public void deleteGenre(String nameOrId) {
        String id = nameOrId.trim().toLowerCase().replace(" ", "_");
        log.info("Deleting Blog Salon House from Firestore by ID: {}", id);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            ApiFuture<WriteResult> writeFuture = docRef.delete();
            writeFuture.get();
            log.info("Successfully deleted Blog Salon House: {}", id);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while deleting blog genre: {}", id, e);
            throw new RuntimeException("Failed to delete genre", e);
        } catch (ExecutionException e) {
            log.error("Error deleting blog genre: {}", id, e);
            throw new RuntimeException("Failed to delete genre", e);
        }
    }

    @SuppressWarnings("unchecked")
    private BlogGenre mapToBlogGenre(DocumentSnapshot doc) {
        if (!doc.exists()) return null;
        Map<String, Map<String, Object>> translations = (Map<String, Map<String, Object>>) doc.get("translations");
        return BlogGenre.builder()
                .id(doc.getString("id"))
                .name(doc.getString("name"))
                .translations(translations != null ? translations : new HashMap<>())
                .build();
    }
}
