package com.royalbookclub.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;

/**
 * Configuration class to initialize the Firebase Admin SDK and expose Firestore bean.
 */
@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${firebase.project-id:royal-book-club}")
    private String projectId;

    /**
     * Initializes FirebaseApp if not already initialized and exposes the Firestore instance.
     *
     * @return The configured Firestore database client
     * @throws IOException If credentials path is provided but file cannot be read
     */
    @Bean
    public Firestore firestore() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            FirebaseOptions.Builder builder = FirebaseOptions.builder()
                    .setProjectId(projectId);

            if (credentialsPath != null && !credentialsPath.isBlank()) {
                log.info("Initializing Firebase App using credentials file: {}", credentialsPath);
                builder.setCredentials(GoogleCredentials.fromStream(new FileInputStream(credentialsPath)));
            } else {
                log.info("Initializing Firebase App with Google Application Default Credentials");
                try {
                    builder.setCredentials(GoogleCredentials.getApplicationDefault());
                } catch (IOException e) {
                    log.warn("Failed to load Application Default Credentials: {}. Falling back to local/mock credentials.", e.getMessage());
                    // Expose mock credentials for local development/testing without GCP credentials
                    builder.setCredentials(GoogleCredentials.create(
                        new com.google.auth.oauth2.AccessToken("mock-token", new java.util.Date(Long.MAX_VALUE))
                    ));
                }
            }

            FirebaseApp.initializeApp(builder.build());
            log.info("Firebase App initialized successfully for project: {}", projectId);
        }
        return FirestoreClient.getFirestore();
    }

    /**
     * Exposes the FirebaseAuth instance.
     *
     * @return The FirebaseAuth instance
     * @throws IOException If default credentials cannot be loaded during fallback
     */
    @Bean
    public com.google.firebase.auth.FirebaseAuth firebaseAuth() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            firestore();
        }
        return com.google.firebase.auth.FirebaseAuth.getInstance();
    }
}

