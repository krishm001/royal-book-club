package com.royalbookclub.api.discourse.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.discourse.model.Discourse;
import com.royalbookclub.api.discourse.model.DiscourseComment;
import com.royalbookclub.api.moderation.service.ContentModerationService;
import com.royalbookclub.api.user.service.UserService;
import com.royalbookclub.api.config.service.CheckoutSettingsService;
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
    private final ContentModerationService moderationService;
    private final UserService userService;
    private final CheckoutSettingsService checkoutSettingsService;

    public DiscourseService(Firestore firestore, ContentModerationService moderationService, UserService userService, CheckoutSettingsService checkoutSettingsService) {
        this.firestore = firestore;
        this.moderationService = moderationService;
        this.userService = userService;
        this.checkoutSettingsService = checkoutSettingsService;
    }

    private String getUserEmail(String userId) {
        if (userId == null || userId.isBlank()) {
            return "anonymous@royalbookclub.com";
        }
        try {
            var user = userService.getUserById(userId);
            if (user != null && user.getEmail() != null) {
                return user.getEmail();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user email for userId: {}", userId, e);
        }
        return "anonymous@royalbookclub.com";
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
                if (d != null && d.getApproved() != null && !d.getApproved()) {
                    continue;
                }
                // For debates, filter root threads in memory to avoid index requirement for null matches
                if ("DEBATE".equalsIgnoreCase(type)) {
                    if (d != null && (d.getParentId() == null || d.getParentId().isBlank())) {
                        list.add(d);
                    }
                } else {
                    if (d != null) {
                        list.add(d);
                    }
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
                Discourse d = mapToDiscourse(document);
                if (d != null && d.getApproved() != null && !d.getApproved()) {
                    return Optional.empty();
                }
                return Optional.ofNullable(d);
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

        // Content Moderation
        String email = getUserEmail(discourse.getAuthorId());

        if ("CHRONICLE".equalsIgnoreCase(discourse.getType())) {
            boolean autoModerateBlogs = checkoutSettingsService.getCheckoutSettings().isAutoModerateBlogs();
            if (!autoModerateBlogs) {
                // By default, Chronicles (blogs) always go to admin approval (approved = false)
                // However, we still run the local RegEx checks to instantly block actual offensive words/spam!
                moderationService.checkLocalRegexText(discourse.getContent(), discourse.getAuthorId(), email, discourse.getType());
                if (discourse.getTitle() != null) {
                    moderationService.checkLocalRegexText(discourse.getTitle(), discourse.getAuthorId(), email, discourse.getType() + "_TITLE");
                }
                if (discourse.getCoverUrl() != null && !discourse.getCoverUrl().isBlank()) {
                    moderationService.checkLocalRegexImage(discourse.getCoverUrl(), discourse.getAuthorId(), email);
                }
                discourse.setApproved(false);
                log.info("Default Policy Active: Blog ID {} requires Curator manual approval.", discourse.getId());
            } else {
                // If autoModerateBlogs is true, run NLP and Vision APIs (real or fallback)
                boolean contentApproved = moderationService.moderateText(discourse.getContent(), discourse.getAuthorId(), email, discourse.getType());
                boolean titleApproved = true;
                if (discourse.getTitle() != null) {
                    titleApproved = moderationService.moderateText(discourse.getTitle(), discourse.getAuthorId(), email, discourse.getType() + "_TITLE");
                }
                boolean imageApproved = true;
                if (discourse.getCoverUrl() != null && !discourse.getCoverUrl().isBlank()) {
                    imageApproved = moderationService.moderateImage(discourse.getCoverUrl(), discourse.getAuthorId(), email);
                }
                discourse.setApproved(contentApproved && titleApproved && imageApproved);
                log.info("Auto-Moderation Preference Active: Blog ID {} approved status set to {}.", discourse.getId(), discourse.getApproved());
            }
        } else {
            // Non-chronicle (e.g., DEBATE, comment) follows standard immediate moderation logic
            boolean contentApproved = moderationService.moderateText(discourse.getContent(), discourse.getAuthorId(), email, discourse.getType());
            boolean titleApproved = true;
            if (discourse.getTitle() != null) {
                titleApproved = moderationService.moderateText(discourse.getTitle(), discourse.getAuthorId(), email, discourse.getType() + "_TITLE");
            }
            boolean imageApproved = true;
            if (discourse.getCoverUrl() != null && !discourse.getCoverUrl().isBlank()) {
                imageApproved = moderationService.moderateImage(discourse.getCoverUrl(), discourse.getAuthorId(), email);
            }
            discourse.setApproved(contentApproved && titleApproved && imageApproved);
        }

        log.info("Saving discourse ID: {}, Type: {}, Approved: {}", discourse.getId(), discourse.getType(), discourse.getApproved());
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
     * Get replies to a debate thread recursively.
     */
    public List<Discourse> getDebateReplies(String debateId) {
        log.debug("Fetching recursive replies for debate ID: {}", debateId);
        List<Discourse> allReplies = new ArrayList<>();
        java.util.Set<String> visited = new java.util.HashSet<>();
        collectRepliesHelper(debateId, allReplies, visited);

        // Sort by createdAt ascending (debates flow forwards in time)
        allReplies.sort((d1, d2) -> {
            if (d1.getCreatedAt() == null || d2.getCreatedAt() == null) return 0;
            return d1.getCreatedAt().compareTo(d2.getCreatedAt());
        });

        return allReplies;
    }

    private void collectRepliesHelper(String parentId, List<Discourse> accumulator, java.util.Set<String> visited) {
        if (parentId == null || parentId.isBlank() || visited.contains(parentId)) {
            return;
        }
        visited.add(parentId);
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection(DISCOURSES_COLLECTION)
                    .whereEqualTo("type", "DEBATE")
                    .whereEqualTo("parentId", parentId)
                    .get();
            QuerySnapshot querySnapshot = query.get();
            List<Discourse> children = new ArrayList<>();
            for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                Discourse d = mapToDiscourse(doc);
                if (d != null && d.getApproved() != null && !d.getApproved()) {
                    continue;
                }
                if (d != null) {
                    children.add(d);
                }
            }
            if (!children.isEmpty()) {
                accumulator.addAll(children);
                for (Discourse child : children) {
                    collectRepliesHelper(child.getId(), accumulator, visited);
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading recursive replies for parent: {}", parentId, e);
            throw new RuntimeException("Failed to read debate replies", e);
        } catch (ExecutionException e) {
            log.error("Error reading recursive replies for parent: {}", parentId, e);
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

        // Content Moderation
        String email = getUserEmail(comment.getAuthorId());
        boolean approved = moderationService.moderateText(comment.getContent(), comment.getAuthorId(), email, "COMMENT");
        comment.setApproved(approved);

        log.info("Saving comment ID: {} for chronicle ID: {}, Approved: {}", comment.getId(), comment.getDiscourseId(), comment.getApproved());
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
                DiscourseComment c = mapToComment(doc);
                if (c != null && c.getApproved() != null && !c.getApproved()) {
                    continue;
                }
                if (c != null) {
                    list.add(c);
                }
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

    /**
     * Fetch a specific chronicle comment by ID.
     */
    public Optional<DiscourseComment> getChronicleCommentById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        try {
            DocumentSnapshot doc = firestore.collection(COMMENTS_COLLECTION).document(id).get().get();
            if (doc.exists()) {
                return Optional.ofNullable(mapToComment(doc));
            }
        } catch (Exception e) {
            log.error("Error reading comment by ID: {}", id, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }
        return Optional.empty();
    }

    /**
     * Delete a chronicle comment by ID.
     */
    public void deleteChronicleComment(String id) {
        log.info("Deleting chronicle comment ID: {}", id);
        try {
            firestore.collection(COMMENTS_COLLECTION).document(id).delete().get();
        } catch (Exception e) {
            log.error("Error deleting comment: {}", id, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException("Failed to delete comment", e);
        }
    }

    /**
     * Delete a discourse and its associated comments or replies recursively.
     */
    public void deleteDiscourse(String id) {
        log.info("Deleting discourse ID: {}", id);
        try {
            Optional<Discourse> discOpt = getDiscourseById(id);
            if (discOpt.isPresent()) {
                Discourse d = discOpt.get();
                // 1. Delete associated comments or replies
                if ("CHRONICLE".equalsIgnoreCase(d.getType())) {
                    // Delete comments in COMMENTS_COLLECTION
                    ApiFuture<QuerySnapshot> commentsQuery = firestore.collection(COMMENTS_COLLECTION)
                            .whereEqualTo("discourseId", id)
                            .get();
                    for (DocumentSnapshot doc : commentsQuery.get().getDocuments()) {
                        firestore.collection(COMMENTS_COLLECTION).document(doc.getId()).delete().get();
                    }
                } else if ("DEBATE".equalsIgnoreCase(d.getType())) {
                    // Delete replies in DISCOURSES_COLLECTION recursively
                    deleteRepliesRecursive(id);
                }
                
                // 2. Delete the main discourse document
                firestore.collection(DISCOURSES_COLLECTION).document(id).delete().get();
                log.info("Successfully deleted discourse: {}", id);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while deleting discourse: {}", id, e);
            throw new RuntimeException("Failed to delete discourse", e);
        } catch (ExecutionException e) {
            log.error("Error deleting discourse: {}", id, e);
            throw new RuntimeException("Failed to delete discourse", e);
        }
    }

    private void deleteRepliesRecursive(String parentId) throws InterruptedException, ExecutionException {
        if (parentId == null || parentId.isBlank()) {
            return;
        }
        ApiFuture<QuerySnapshot> repliesQuery = firestore.collection(DISCOURSES_COLLECTION)
                .whereEqualTo("type", "DEBATE")
                .whereEqualTo("parentId", parentId)
                .get();
        for (DocumentSnapshot doc : repliesQuery.get().getDocuments()) {
            String childId = doc.getId();
            // First, delete child's replies recursively
            deleteRepliesRecursive(childId);
            // Then, delete the child document itself
            firestore.collection(DISCOURSES_COLLECTION).document(childId).delete().get();
        }
    }

    /**
     * Toggle a quick-emoji reaction on a discourse (CHRONICLE or DEBATE node/reply).
     */
    @SuppressWarnings("unchecked")
    public Discourse toggleReaction(String discourseId, String reactionType, String userId) {
        log.info("Toggling reaction: {} by user: {} on discourse: {}", reactionType, userId, discourseId);
        DocumentReference docRef = firestore.collection(DISCOURSES_COLLECTION).document(discourseId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot doc = transaction.get(docRef).get();
                if (!doc.exists()) {
                    throw new IllegalArgumentException("Discourse not found with ID: " + discourseId);
                }

                Map<String, Object> data = doc.getData();
                Map<String, List<String>> reactions = null;
                if (data != null) {
                    reactions = (Map<String, List<String>>) data.get("reactions");
                }
                if (reactions == null) {
                    reactions = new HashMap<>();
                } else {
                    reactions = new HashMap<>(reactions);
                }

                List<String> users = reactions.get(reactionType);
                if (users == null) {
                    users = new ArrayList<>();
                } else {
                    users = new ArrayList<>(users);
                }

                if (users.contains(userId)) {
                    users.remove(userId);
                } else {
                    users.add(userId);
                }

                if (users.isEmpty()) {
                    reactions.remove(reactionType);
                } else {
                    reactions.put(reactionType, users);
                }

                transaction.update(docRef, "reactions", reactions);
                return null;
            }).get();

            return getDiscourseById(discourseId)
                    .orElseThrow(() -> new RuntimeException("Failed to read discourse after toggling reaction."));
        } catch (Exception e) {
            log.error("Error toggling reaction: {} on discourse: {}", reactionType, discourseId, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException("Failed to toggle reaction: " + e.getMessage(), e);
        }
    }

    /**
     * Toggle a quick-emoji reaction on a comment.
     */
    @SuppressWarnings("unchecked")
    public DiscourseComment toggleCommentReaction(String commentId, String reactionType, String userId) {
        log.info("Toggling reaction: {} by user: {} on comment: {}", reactionType, userId, commentId);
        DocumentReference docRef = firestore.collection(COMMENTS_COLLECTION).document(commentId);

        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot doc = transaction.get(docRef).get();
                if (!doc.exists()) {
                    throw new IllegalArgumentException("Comment not found with ID: " + commentId);
                }

                Map<String, Object> data = doc.getData();
                Map<String, List<String>> reactions = null;
                if (data != null) {
                    reactions = (Map<String, List<String>>) data.get("reactions");
                }
                if (reactions == null) {
                    reactions = new HashMap<>();
                } else {
                    reactions = new HashMap<>(reactions);
                }

                List<String> users = reactions.get(reactionType);
                if (users == null) {
                    users = new ArrayList<>();
                } else {
                    users = new ArrayList<>(users);
                }

                if (users.contains(userId)) {
                    users.remove(userId);
                } else {
                    users.add(userId);
                }

                if (users.isEmpty()) {
                    reactions.remove(reactionType);
                } else {
                    reactions.put(reactionType, users);
                }

                transaction.update(docRef, "reactions", reactions);
                return null;
            }).get();

            DocumentSnapshot docSnap = docRef.get().get();
            return mapToComment(docSnap);
        } catch (Exception e) {
            log.error("Error toggling reaction: {} on comment: {}", reactionType, commentId, e);
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException("Failed to toggle comment reaction: " + e.getMessage(), e);
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
        map.put("reactions", d.getReactions() != null ? d.getReactions() : new HashMap<String, List<String>>());
        map.put("approved", d.getApproved() != null ? d.getApproved() : true);
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
        Map<String, List<String>> reactions = (Map<String, List<String>>) doc.get("reactions");

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
                .approved(doc.contains("approved") ? doc.getBoolean("approved") : true)
                .reactions(reactions != null ? reactions : new HashMap<>())
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
        map.put("reactions", c.getReactions() != null ? c.getReactions() : new HashMap<String, List<String>>());
        map.put("approved", c.getApproved() != null ? c.getApproved() : true);
        map.put("createdAt", c.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(c.getCreatedAt().getEpochSecond(), c.getCreatedAt().getNano()) : null);
        return map;
    }

    @SuppressWarnings("unchecked")
    private DiscourseComment mapToComment(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");
        Map<String, List<String>> reactions = (Map<String, List<String>>) doc.get("reactions");

        return DiscourseComment.builder()
                .id(doc.getString("id"))
                .discourseId(doc.getString("discourseId"))
                .authorId(doc.getString("authorId"))
                .authorName(doc.getString("authorName"))
                .authorPhotoUrl(doc.getString("authorPhotoUrl"))
                .content(doc.getString("content"))
                .approved(doc.contains("approved") ? doc.getBoolean("approved") : true)
                .reactions(reactions != null ? reactions : new HashMap<>())
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .build();
    }
}
