package com.royalbookclub.api.config.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.config.model.CheckoutSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage library self-checkout gating settings.
 */
@Service
public class CheckoutSettingsService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutSettingsService.class);
    private static final String COLLECTION_NAME = "settings";
    private static final String DOCUMENT_ID = "checkoutSettings";

    private final Firestore firestore;

    public CheckoutSettingsService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Retrieve the current CheckoutSettings from Firestore.
     * Defaults to all fields being optional if not configured yet.
     */
    public CheckoutSettings getCheckoutSettings() {
        log.debug("Fetching checkout profile verification configurations");
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(DOCUMENT_ID);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();

            if (document.exists()) {
                return CheckoutSettings.builder()
                        .id(DOCUMENT_ID)
                        .phoneMandatory(Boolean.TRUE.equals(document.getBoolean("phoneMandatory")))
                        .houseNoMandatory(Boolean.TRUE.equals(document.getBoolean("houseNoMandatory")))
                        .streetMandatory(Boolean.TRUE.equals(document.getBoolean("streetMandatory")))
                        .cityMandatory(Boolean.TRUE.equals(document.getBoolean("cityMandatory")))
                        .pinCodeMandatory(Boolean.TRUE.equals(document.getBoolean("pinCodeMandatory")))
                        .autoModerateBlogs(Boolean.TRUE.equals(document.getBoolean("autoModerateBlogs")))
                        .libraryLatitude(document.getDouble("libraryLatitude"))
                        .libraryLongitude(document.getDouble("libraryLongitude"))
                        .validRadiusMeters(document.getDouble("validRadiusMeters"))
                        .enforceEmailVerification(Boolean.TRUE.equals(document.getBoolean("enforceEmailVerification")))
                        .build();
            } else {
                log.info("No checkout settings document found. Initializing with optional defaults.");
                return CheckoutSettings.builder()
                        .id(DOCUMENT_ID)
                        .phoneMandatory(false)
                        .houseNoMandatory(false)
                        .streetMandatory(false)
                        .cityMandatory(false)
                        .pinCodeMandatory(false)
                        .autoModerateBlogs(false)
                        .libraryLatitude(37.7749) // SF default or equivalent
                        .libraryLongitude(-122.4194)
                        .validRadiusMeters(100.0)
                        .enforceEmailVerification(false)
                        .build();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading checkout settings", e);
            throw new RuntimeException("Failed to read checkout settings", e);
        } catch (ExecutionException e) {
            log.error("Database error reading checkout settings", e);
            throw new RuntimeException("Failed to read checkout settings", e);
        }
    }

    /**
     * Update the CheckoutSettings inside Firestore settings collection.
     */
    public CheckoutSettings saveCheckoutSettings(CheckoutSettings settings) {
        log.info("Updating checkout profile verification configurations");
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(DOCUMENT_ID);
            Map<String, Object> map = new HashMap<>();
            map.put("id", DOCUMENT_ID);
            map.put("phoneMandatory", settings.isPhoneMandatory());
            map.put("houseNoMandatory", settings.isHouseNoMandatory());
            map.put("streetMandatory", settings.isStreetMandatory());
            map.put("cityMandatory", settings.isCityMandatory());
            map.put("pinCodeMandatory", settings.isPinCodeMandatory());
            map.put("autoModerateBlogs", settings.isAutoModerateBlogs());
            map.put("libraryLatitude", settings.getLibraryLatitude());
            map.put("libraryLongitude", settings.getLibraryLongitude());
            map.put("validRadiusMeters", settings.getValidRadiusMeters());
            map.put("enforceEmailVerification", settings.isEnforceEmailVerification());

            ApiFuture<WriteResult> writeFuture = docRef.set(map);
            writeFuture.get();
            log.info("Successfully updated checkout settings in Firestore");
            
            settings.setId(DOCUMENT_ID);
            return settings;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving checkout settings", e);
            throw new RuntimeException("Failed to save checkout settings", e);
        } catch (ExecutionException e) {
            log.error("Database error saving checkout settings", e);
            throw new RuntimeException("Failed to save checkout settings", e);
        }
    }
}
