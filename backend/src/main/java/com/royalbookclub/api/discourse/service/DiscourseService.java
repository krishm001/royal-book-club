package com.royalbookclub.api.discourse.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.discourse.model.Discourse;
import com.royalbookclub.api.discourse.model.DiscourseComment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/**
 * Service to manage Intellectual Chronicles and Courtyard Debates in Cloud Firestore.
 */
@Service
public class DiscourseService {

    private static final Logger log = LoggerFactory.getLogger(DiscourseService.class);
    private static final String DISCOURSES_COLLECTION = "discourses";
    private static final String COMMENTS_COLLECTION = "discourse_comments";

    private final Firestore firestore;

    public DiscourseService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Retrieve all root discourses of a specific type.
     * Root chronicles or root debates (parentId is null).
     */
    public List<Discourse> getRootDiscourses(String type) {
        log.debug("Fetching root discourses of type: {}", type);
        try {
            ApiFuture<QuerySnapshot> query;
            if ("DEBATE".equalsIgnoreCase(type)) {
                // Return only root debates where parentId is null or empty
                query = firestore.collection(DISCOURSES_COLLECTION)
                        .whereEqualTo("type", "DEBATE")
                        .get();
            } else {
                query = firestore.collection(DISCOURSES_COLLECTION)
                        .whereEqualTo("type", "CHRONICLE")
                        .get();
            }

            QuerySnapshot querySnapshot = query.get();
            List<Discourse> list = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                Discourse d = mapToDiscourse(doc);
                // For debates, filter root threads in memory to avoid index requirement for null matches
                if ("DEBATE".equalsIgnoreCase(type)) {
                    if (d.getParentId() == null || d.getParentId().isBlank()) {
                        list.add(d);
                    }
                } else {
                    list.add(d);
                }
            }

            // Sort by createdAt descending
            list.sort((d1, d2) -> {
                if (d1.getCreatedAt() == null || d2.getCreatedAt() == null) return 0;
                return d2.getCreatedAt().compareTo(d1.getCreatedAt());
            });

            return list;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading root discourses", e);
            throw new RuntimeException("Failed to read discourses", e);
        } catch (ExecutionException e) {
            log.error("Error reading root discourses", e);
            throw new RuntimeException("Failed to read discourses", e);
        }
    }

    /**
     * Retrieve a specific discourse by ID.
     */
    public Optional<Discourse> getDiscourseById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        log.debug("Fetching discourse by ID: {}", id);
        try {
            DocumentReference docRef = firestore.collection(DISCOURSES_COLLECTION).document(id);
            ApiFuture<DocumentSnapshot> future = docRef.get();
            DocumentSnapshot document = future.get();
            if (document.exists()) {
                return Optional.of(mapToDiscourse(document));
            }
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while fetching discourse: {}", id, e);
            throw new RuntimeException("Failed to read discourse", e);
        } catch (ExecutionException e) {
            log.error("Error fetching discourse: {}", id, e);
            throw new RuntimeException("Failed to read discourse", e);
        }
    }

    /**
     * Save a new discourse (Chronicle, root Debate, or Debate reply).
     */
    public Discourse saveDiscourse(Discourse discourse) {
        if (discourse.getId() == null || discourse.getId().isBlank()) {
            discourse.setId(UUID.randomUUID().toString());
        }
        Instant now = Instant.now();
        if (discourse.getCreatedAt() == null) {
            discourse.setCreatedAt(now);
        }
        discourse.setUpdatedAt(now);

        log.info("Saving discourse ID: {}, Type: {}", discourse.getId(), discourse.getType());
        try {
            DocumentReference docRef = firestore.collection(DISCOURSES_COLLECTION).document(discourse.getId());
            ApiFuture<WriteResult> writeFuture = docRef.set(discourseToMap(discourse));
            writeFuture.get();
            log.info("Successfully saved discourse: {}", discourse.getId());
            return discourse;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving discourse: {}", discourse.getId(), e);
            throw new RuntimeException("Failed to save discourse", e);
        } catch (ExecutionException e) {
            log.error("Error saving discourse: {}", discourse.getId(), e);
            throw new RuntimeException("Failed to save discourse", e);
        }
    }

    /**
     * Get replies to a debate thread.
     */
    public List<Discourse> getDebateReplies(String debateId) {
        log.debug("Fetching replies for debate ID: {}", debateId);
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(DISCOURSES_COLLECTION)
                    .whereEqualTo("type", "DEBATE")
                    .whereEqualTo("parentId", debateId)
                    .get();
            QuerySnapshot querySnapshot = query.get();
            List<Discourse> list = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                list.add(mapToDiscourse(doc));
            }

            // Sort by createdAt ascending (debates flow forwards in time)
            list.sort((d1, d2) -> {
                if (d1.getCreatedAt() == null || d2.getCreatedAt() == null) return 0;
                return d1.getCreatedAt().compareTo(d2.getCreatedAt());
            });

            return list;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading debate replies for: {}", debateId, e);
            throw new RuntimeException("Failed to read debate replies", e);
        } catch (ExecutionException e) {
            log.error("Error reading debate replies for: {}", debateId, e);
            throw new RuntimeException("Failed to read debate replies", e);
        }
    }

    /**
     * Save a comment on an Intellectual Chronicle.
     */
    public DiscourseComment saveChronicleComment(DiscourseComment comment) {
        if (comment.getId() == null || comment.getId().isBlank()) {
            comment.setId(UUID.randomUUID().toString());
        }
        if (comment.getCreatedAt() == null) {
            comment.setCreatedAt(Instant.now());
        }

        log.info("Saving comment ID: {} for chronicle ID: {}", comment.getId(), comment.getDiscourseId());
        try {
            DocumentReference docRef = firestore.collection(COMMENTS_COLLECTION).document(comment.getId());
            ApiFuture<WriteResult> writeFuture = docRef.set(commentToMap(comment));
            writeFuture.get();
            log.info("Successfully saved chronicle comment: {}", comment.getId());
            return comment;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while saving chronicle comment: {}", comment.getId(), e);
            throw new RuntimeException("Failed to save comment", e);
        } catch (ExecutionException e) {
            log.error("Error saving chronicle comment: {}", comment.getId(), e);
            throw new RuntimeException("Failed to save comment", e);
        }
    }

    /**
     * Get all comments for a chronicle.
     */
    public List<DiscourseComment> getChronicleComments(String chronicleId) {
        log.debug("Fetching comments for chronicle ID: {}", chronicleId);
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(COMMENTS_COLLECTION)
                    .whereEqualTo("discourseId", chronicleId)
                    .get();
            QuerySnapshot querySnapshot = query.get();
            List<DiscourseComment> list = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                list.add(mapToComment(doc));
            }

            // Sort by createdAt descending (newest comments first)
            list.sort((c1, c2) -> {
                if (c1.getCreatedAt() == null || c2.getCreatedAt() == null) return 0;
                return c2.getCreatedAt().compareTo(c1.getCreatedAt());
            });

            return list;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading comments for: {}", chronicleId, e);
            throw new RuntimeException("Failed to read comments", e);
        } catch (ExecutionException e) {
            log.error("Error reading comments for: {}", chronicleId, e);
            throw new RuntimeException("Failed to read comments", e);
        }
    }

    private Map<String, Object> discourseToMap(Discourse d) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", d.getId());
        map.put("type", d.getType());
        map.put("title", d.getTitle());
        map.put("content", d.getContent());
        map.put("authorId", d.getAuthorId());
        map.put("authorName", d.getAuthorName());
        map.put("authorPhotoUrl", d.getAuthorPhotoUrl());
        map.put("coverUrl", d.getCoverUrl());
        map.put("house", d.getHouse());
        map.put("tags", d.getTags() != null ? d.getTags() : new ArrayList<String>());
        map.put("parentId", d.getParentId());
        map.put("createdAt", d.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(d.getCreatedAt().getEpochSecond(), d.getCreatedAt().getNano()) : null);
        map.put("updatedAt", d.getUpdatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(d.getUpdatedAt().getEpochSecond(), d.getUpdatedAt().getNano()) : null);
        return map;
    }

    @SuppressWarnings("unchecked")
    private Discourse mapToDiscourse(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");
        com.google.cloud.Timestamp updatedTimestamp = doc.getTimestamp("updatedAt");
        List<String> tags = (List<String>) doc.get("tags");

        return Discourse.builder()
                .id(doc.getString("id"))
                .type(doc.getString("type"))
                .title(doc.getString("title"))
                .content(doc.getString("content"))
                .authorId(doc.getString("authorId"))
                .authorName(doc.getString("authorName"))
                .authorPhotoUrl(doc.getString("authorPhotoUrl"))
                .coverUrl(doc.getString("coverUrl"))
                .house(doc.getString("house"))
                .tags(tags != null ? tags : new ArrayList<>())
                .parentId(doc.getString("parentId"))
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .updatedAt(updatedTimestamp != null ? Instant.ofEpochSecond(updatedTimestamp.getSeconds(), updatedTimestamp.getNanos()) : null)
                .build();
    }

    private Map<String, Object> commentToMap(DiscourseComment c) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", c.getId());
        map.put("discourseId", c.getDiscourseId());
        map.put("authorId", c.getAuthorId());
        map.put("authorName", c.getAuthorName());
        map.put("authorPhotoUrl", c.getAuthorPhotoUrl());
        map.put("content", c.getContent());
        map.put("createdAt", c.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(c.getCreatedAt().getEpochSecond(), c.getCreatedAt().getNano()) : null);
        return map;
    }

    private DiscourseComment mapToComment(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");

        return DiscourseComment.builder()
                .id(doc.getString("id"))
                .discourseId(doc.getString("discourseId"))
                .authorId(doc.getString("authorId"))
                .authorName(doc.getString("authorName"))
                .authorPhotoUrl(doc.getString("authorPhotoUrl"))
                .content(doc.getString("content"))
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .build();
    }
}
