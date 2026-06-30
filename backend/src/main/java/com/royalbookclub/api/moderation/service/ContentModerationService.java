package com.royalbookclub.api.moderation.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.royalbookclub.api.common.exception.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Dual-layer Content Moderation Engine.
 * 1. RegEx dictionary checks for immediate blocks (spam and offensive language).
 * 2. Simulated Google Cloud NLP & Vision API check with monthly free-tier count persistence.
 * Bypasses API checks and routes new submissions to the Admin Review queue (approved = false)
 * when the simulated 70,000 ceiling is exceeded.
 */
@Service
public class ContentModerationService {

    private static final Logger log = LoggerFactory.getLogger(ContentModerationService.class);
    private final Firestore firestore;

    // RegEx patterns for profanity/insults
    private static final Pattern PROFANITY_PATTERN = Pattern.compile(
            "\\b(fuck|shit|asshole|bastard|bitch|dick|crap|idiot|stupid|moron|dumbass|fuckup|shitty)\\b",
            Pattern.CASE_INSENSITIVE
    );

    // RegEx patterns for commercial spam
    private static final Pattern SPAM_PATTERN = Pattern.compile(
            "\\b(viagra|cialis|casino|bitcoin|crypto|lottery|win cash|click here|pharmacy|buy cheap|earn money|get rich)\\b",
            Pattern.CASE_INSENSITIVE
    );

    public ContentModerationService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Moderates text content.
     * Returns true if immediately approved, and false if routed to admin review.
     * Throws BusinessRuleException if blocked immediately.
     */
    public boolean moderateText(String text, String userId, String userEmail, String contentType) {
        if (text == null || text.trim().isEmpty()) {
            return true;
        }

        // Layer 1: RegEx Check
        if (PROFANITY_PATTERN.matcher(text).find()) {
            logBlockedContent(contentType, text, "Local RegEx Filter: Swear/Insult detected", userId, userEmail);
            throw new BusinessRuleException("Your submission contains inappropriate language (profanity/insults) and has been blocked.");
        }

        if (SPAM_PATTERN.matcher(text).find()) {
            logBlockedContent(contentType, text, "Local RegEx Filter: Commercial spam detected", userId, userEmail);
            throw new BusinessRuleException("Your submission matches commercial advertising profiles and has been blocked.");
        }

        // Layer 2: API check (simulated with month-to-date tracking)
        long currentCount = getAndIncrementApiCount();
        if (currentCount <= 70000) {
            log.info("Calling simulated Google Cloud Natural Language API. Current month API count: {}", currentCount);
            
            // Look for soft trigger words simulated to fail NLP API analysis
            String lowercase = text.toLowerCase();
            if (lowercase.contains("spam") || lowercase.contains("offensive") || lowercase.contains("insult") || lowercase.contains("abuse") || lowercase.contains("scam")) {
                logBlockedContent(contentType, text, "Simulated Google Cloud NLP API: Flagged for toxicity/spam/insults", userId, userEmail);
                throw new BusinessRuleException("Our automated moderation API flagged this content as potentially toxic, abusive, or spam. Submission blocked.");
            }
            return true; // Passed API, approved immediately
        } else {
            // Above free tier: bypass API and route to admin review
            log.info("Moderation API free-tier ceiling exceeded (>70k). Routing content to Admin Review queue.");
            return false; // Returns false, indicating pending approval
        }
    }

    /**
     * Moderates image content (checks URL).
     * Returns true if immediately approved, and false if routed to admin review.
     * Throws BusinessRuleException if blocked immediately.
     */
    public boolean moderateImage(String imageUrl, String userId, String userEmail) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return true;
        }

        // Layer 1: RegEx Check on image URL
        String urlLower = imageUrl.toLowerCase();
        if (urlLower.contains("adult") || urlLower.contains("violent") || urlLower.contains("nude") || urlLower.contains("weapons") || urlLower.contains("blood")) {
            logBlockedContent("IMAGE", imageUrl, "Local Vision Filter: Adult/Violent keywords matched in URL", userId, userEmail);
            throw new BusinessRuleException("The image URL contains keywords indicating adult or violent content and has been blocked.");
        }

        // Layer 2: API check
        long currentCount = getAndIncrementApiCount();
        if (currentCount <= 70000) {
            log.info("Calling simulated Google Cloud Vision API. Current month API count: {}", currentCount);
            if (urlLower.contains("nsfw") || urlLower.contains("gore") || urlLower.contains("violence")) {
                logBlockedContent("IMAGE", imageUrl, "Simulated Google Cloud Vision API: Flagged for adult/violent/unfitting elements", userId, userEmail);
                throw new BusinessRuleException("Our automated image analysis API flagged this image as unsafe or unfitting.");
            }
            return true; // Approved
        } else {
            log.info("Image moderation API limit exceeded. Routing image to Admin Review queue.");
            return false; // Route to review
        }
    }

    /**
     * Logs blocked content to the Firestore "blocked_contents" collection.
     */
    private void logBlockedContent(String contentType, String content, String reason, String userId, String userEmail) {
        log.warn("Blocking content. Type: {}, Reason: {}, User: {}", contentType, reason, userEmail != null ? userEmail : userId);
        try {
            String id = UUID.randomUUID().toString();
            DocumentReference docRef = firestore.collection("blocked_contents").document(id);

            Map<String, Object> map = new HashMap<>();
            map.put("id", id);
            map.put("contentType", contentType);
            map.put("content", content);
            map.put("reason", reason);
            map.put("userId", userId != null ? userId : "GUEST");
            map.put("userEmail", userEmail != null ? userEmail : "anonymous@royalbookclub.com");
            map.put("blockedAt", com.google.cloud.Timestamp.now());

            docRef.set(map).get();
        } catch (Exception e) {
            log.error("Failed to log blocked content inside Firestore", e);
        }
    }

    /**
     * Fetches current API usage count for the month and increments it by 1.
     * Persisted in settings/moderationStats Firestore document.
     */
    private synchronized long getAndIncrementApiCount() {
        try {
            String currentMonth = DateTimeFormatter.ofPattern("yyyy-MM")
                    .withZone(ZoneId.of("UTC"))
                    .format(Instant.now());

            DocumentReference docRef = firestore.collection("settings").document("moderationStats");
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot doc = future.get();

            long apiCount = 1;
            if (doc.exists()) {
                String month = doc.getString("month");
                if (currentMonth.equals(month)) {
                    Long countVal = doc.getLong("apiCount");
                    apiCount = (countVal != null ? countVal : 0) + 1;
                }
            }

            Map<String, Object> map = new HashMap<>();
            map.put("month", currentMonth);
            map.put("apiCount", apiCount);
            docRef.set(map).get();

            return apiCount;
        } catch (Exception e) {
            log.error("Failed to fetch or increment moderation API counter", e);
            return 0; // Return zero as fallback
        }
    }
}
