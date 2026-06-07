package com.royalbookclub.api.config.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.config.model.HeroConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage home page hero configuration settings in Cloud Firestore.
 */
@Service
public class HeroConfigService {

    private static final Logger log = LoggerFactory.getLogger(HeroConfigService.class);
    private static final String COLLECTION_NAME = "settings";
    private static final String DOCUMENT_ID = "homeHero";

    private final Firestore firestore;

    public HeroConfigService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Fetch current Home Hero settings.
     * Returns default values if not configured yet in the database.
     */
    public HeroConfig getHeroConfig() {
        log.debug("Fetching Home Hero configurations");
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(DOCUMENT_ID);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();

            if (document.exists()) {
                return HeroConfig.builder()
                        .id(DOCUMENT_ID)
                        .title(document.getString("title"))
                        .subtitle(document.getString("subtitle"))
                        .backgroundImageUrl(document.getString("backgroundImageUrl"))
                        .backgroundImageUrlSalon(document.getString("backgroundImageUrlSalon"))
                        .backgroundImageUrlAcademic(document.getString("backgroundImageUrlAcademic"))
                        .build();
            } else {
                log.info("No Home Hero settings found. Returning default aesthetic values.");
                return HeroConfig.builder()
                        .id(DOCUMENT_ID)
                        .title("Voices, Ideas, Community")
                        .subtitle("Where literature meets high society. Welcome to the Royal Salon of letters.")
                        .backgroundImageUrl("")
                        .backgroundImageUrlSalon("")
                        .backgroundImageUrlAcademic("")
                        .build();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading Home Hero settings", e);
            throw new RuntimeException("Failed to read settings", e);
        } catch (ExecutionException e) {
            log.error("Error reading Home Hero settings", e);
            throw new RuntimeException("Failed to read settings", e);
        }
    }

    /**
     * Save/update Home Hero configuration.
     */
    public HeroConfig saveHeroConfig(HeroConfig config) {
        log.info("Saving Home Hero configuration settings");
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(DOCUMENT_ID);
            Map<String, Object> map = new HashMap<>();
            map.put("id", DOCUMENT_ID);
            map.put("title", config.getTitle() != null ? config.getTitle().trim() : "");
            map.put("subtitle", config.getSubtitle() != null ? config.getSubtitle().trim() : "");
            map.put("backgroundImageUrl", config.getBackgroundImageUrl() != null ? config.getBackgroundImageUrl().trim() : "");
            map.put("backgroundImageUrlSalon", config.getBackgroundImageUrlSalon() != null ? config.getBackgroundImageUrlSalon().trim() : "");
            map.put("backgroundImageUrlAcademic", config.getBackgroundImageUrlAcademic() != null ? config.getBackgroundImageUrlAcademic().trim() : "");

            ApiFuture<WriteResult> writeFuture = docRef.set(map);
            writeFuture.get();
            log.info("Successfully updated Home Hero config document");
            
            config.setId(DOCUMENT_ID);
            return config;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving Home Hero configurations", e);
            throw new RuntimeException("Failed to save settings", e);
        } catch (ExecutionException e) {
            log.error("Error saving Home Hero configurations", e);
            throw new RuntimeException("Failed to save settings", e);
        }
    }

    /**
     * Delete Home Hero configuration.
     */
    public void deleteHeroConfig() {
        log.info("Deleting Home Hero configuration settings");
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(DOCUMENT_ID);
            docRef.delete().get();
            log.info("Successfully deleted Home Hero config document");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while deleting Home Hero configurations", e);
            throw new RuntimeException("Failed to delete settings", e);
        } catch (ExecutionException e) {
            log.error("Error deleting Home Hero configurations", e);
            throw new RuntimeException("Failed to delete settings", e);
        }
    }
}
