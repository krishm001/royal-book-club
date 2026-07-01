package com.royalbookclub.api.poll.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteBatch;
import com.royalbookclub.api.common.exception.BusinessRuleException;
import com.royalbookclub.api.common.exception.ResourceNotFoundException;
import com.royalbookclub.api.poll.dto.PollDto;
import com.royalbookclub.api.poll.model.Poll;
import com.royalbookclub.api.user.model.User;
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
 * Service managing Guild Plebiscites (polls) on Google Cloud Firestore.
 */
@Service
public class PollService {

    private static final Logger log = LoggerFactory.getLogger(PollService.class);
    private static final String COLLECTION_NAME = "polls";

    private final Firestore firestore;

    public PollService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Retrieves the single active poll.
     * If no active poll is found, returns an aesthetic default poll.
     */
    public Poll getActivePoll() {
        log.debug("Fetching the active Guild Plebiscite");
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME)
                    .whereEqualTo("active", true)
                    .limit(1)
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            if (!documents.isEmpty()) {
                return mapToPoll(documents.get(0));
            }

            log.info("No active poll found. Rendering standard default plebiscite.");
            return createDefaultFallbackPoll();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading active poll", e);
            throw new RuntimeException("Failed to read active poll", e);
        } catch (ExecutionException e) {
            log.error("Database error reading active poll", e);
            throw new RuntimeException("Failed to read active poll", e);
        }
    }

    /**
     * Retrieve all polls in descending order of creation.
     */
    public List<Poll> getPollHistory() {
        log.debug("Retrieving historical Guild Plebiscites archive");
        try {
            ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME)
                    .orderBy("createdAt", Query.Direction.DESCENDING)
                    .get();
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            List<Poll> history = new ArrayList<>();
            for (DocumentSnapshot doc : documents) {
                history.add(mapToPoll(doc));
            }
            return history;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while reading poll history", e);
            throw new RuntimeException("Failed to read poll history", e);
        } catch (ExecutionException e) {
            log.error("Database error reading poll history", e);
            throw new RuntimeException("Failed to read poll history", e);
        }
    }

    /**
     * Create a new poll. Marks it active and deactivates any existing active polls.
     */
    public Poll createPoll(PollDto pollDto) {
        log.info("Creating a new Guild Plebiscite: '{}'", pollDto.getQuestion());
        String id = UUID.randomUUID().toString();
        
        List<Integer> initialVotes = List.of(0, 0, 0, 0);

        Poll newPoll = Poll.builder()
                .id(id)
                .question(pollDto.getQuestion().trim())
                .options(pollDto.getOptions())
                .votes(initialVotes)
                .active(true)
                .membersOnly(pollDto.isMembersOnly())
                .createdAt(Instant.now())
                .translations(pollDto.getTranslations() != null ? pollDto.getTranslations() : new HashMap<>())
                .build();

        try {
            // Deactivate other polls
            deactivateAllPolls();

            // Set new active poll
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            docRef.set(pollToMap(newPoll)).get();
            
            log.info("Successfully published new active poll: {}", id);
            return newPoll;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while writing new poll", e);
            throw new RuntimeException("Failed to write new poll", e);
        } catch (ExecutionException e) {
            log.error("Database error writing new poll", e);
            throw new RuntimeException("Failed to write new poll", e);
        }
    }

    /**
     * Activates a past poll, automatically deactivating the current active poll.
     */
    public Poll activatePoll(String id) {
        log.info("Reactivating historical plebiscite ID: {}", id);
        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
            DocumentSnapshot doc = docRef.get().get();
            if (!doc.exists()) {
                throw new ResourceNotFoundException("Target plebiscite not found in archive: " + id);
            }

            // Deactivate all active polls
            deactivateAllPolls();

            // Reactivate this specific poll
            docRef.update("active", true).get();
            log.info("Successfully activated plebiscite ID: {}", id);

            return mapToPoll(docRef.get().get());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted during poll activation", e);
            throw new RuntimeException("Failed to activate poll", e);
        } catch (ExecutionException e) {
            log.error("Database error during poll activation", e);
            throw new RuntimeException("Failed to activate poll", e);
        }
    }

    /**
     * Casts an aggregated vote for a specific option index.
     * Executes inside a Firestore Transaction to guarantee atomic increments.
     */
    public void vote(String id, int optionIndex, User user) {
        if (optionIndex < 0 || optionIndex > 3) {
            throw new BusinessRuleException("Option index must be between 0 and 3.");
        }

        log.info("Casting vote on poll {} for option {}", id, optionIndex);
        DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);

        try {
            firestore.runTransaction(transaction -> {
                DocumentSnapshot snapshot = transaction.get(docRef).get();
                if (!snapshot.exists()) {
                    throw new ResourceNotFoundException("Target plebiscite not found.");
                }

                boolean membersOnly = snapshot.getBoolean("membersOnly") != null && snapshot.getBoolean("membersOnly");
                if (membersOnly && user == null) {
                    throw new BusinessRuleException("This plebiscite is restricted to registered Guild Members.");
                }

                List<Long> votesLong = (List<Long>) snapshot.get("votes");
                if (votesLong == null || votesLong.size() != 4) {
                    votesLong = List.of(0L, 0L, 0L, 0L);
                }

                List<Long> updatedVotes = new ArrayList<>(votesLong);
                updatedVotes.set(optionIndex, updatedVotes.get(optionIndex) + 1);

                transaction.update(docRef, "votes", updatedVotes);
                return null;
            }).get();

            log.info("Atomically recorded vote for poll {} option {}", id, optionIndex);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while casting vote on poll: {}", id, e);
            throw new RuntimeException("Failed to cast vote", e);
        } catch (ExecutionException e) {
            log.error("Error committing vote transaction on poll: {}", id, e);
            if (e.getCause() instanceof BusinessRuleException) {
                throw (BusinessRuleException) e.getCause();
            }
            throw new RuntimeException("Failed to cast vote due to database error", e);
        }
    }

    /**
     * Helper to set all other polls to active = false.
     */
    private void deactivateAllPolls() throws ExecutionException, InterruptedException {
        ApiFuture<QuerySnapshot> activePolls = firestore.collection(COLLECTION_NAME)
                .whereEqualTo("active", true)
                .get();

        List<QueryDocumentSnapshot> docs = activePolls.get().getDocuments();
        if (!docs.isEmpty()) {
            WriteBatch batch = firestore.batch();
            for (DocumentSnapshot doc : docs) {
                batch.update(doc.getReference(), "active", false);
            }
            batch.commit().get();
            log.debug("Deactivated {} previously active polls", docs.size());
        }
    }

    private Poll createDefaultFallbackPoll() {
        return Poll.builder()
                .id("weekly-book-poll")
                .question("Which masterwork should be selected for the Sovereign Guild Summer Read?")
                .options(List.of(
                        "The Picture of Dorian Gray — Oscar Wilde",
                        "The Great Gatsby — F. Scott Fitzgerald",
                        "Pride and Prejudice — Jane Austen",
                        "Crime and Punishment — Fyodor Dostoevsky"
                ))
                .votes(List.of(142, 98, 167, 115))
                .active(true)
                .membersOnly(false)
                .createdAt(Instant.parse("2026-06-01T00:00:00Z"))
                .build();
    }

    private Map<String, Object> pollToMap(Poll poll) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", poll.getId());
        map.put("question", poll.getQuestion());
        map.put("options", poll.getOptions());
        map.put("votes", poll.getVotes());
        map.put("active", poll.isActive());
        map.put("membersOnly", poll.isMembersOnly());
        map.put("createdAt", poll.getCreatedAt() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(poll.getCreatedAt().getEpochSecond(), poll.getCreatedAt().getNano()) : null);
        map.put("translations", poll.getTranslations() != null ? poll.getTranslations() : new HashMap<String, Map<String, Object>>());
        return map;
    }

    @SuppressWarnings("unchecked")
    private Poll mapToPoll(DocumentSnapshot doc) {
        if (!doc.exists()) return null;

        com.google.cloud.Timestamp createdTimestamp = doc.getTimestamp("createdAt");
        List<String> options = (List<String>) doc.get("options");
        List<Long> votesLong = (List<Long>) doc.get("votes");
        Map<String, Map<String, Object>> translations = (Map<String, Map<String, Object>>) doc.get("translations");
        List<Integer> votes = new ArrayList<>();
        if (votesLong != null) {
            for (Long v : votesLong) {
                votes.add(v.intValue());
            }
        } else {
            votes = List.of(0, 0, 0, 0);
        }

        return Poll.builder()
                .id(doc.getString("id"))
                .question(doc.getString("question"))
                .options(options != null ? options : new ArrayList<>())
                .votes(votes)
                .active(doc.getBoolean("active") != null && doc.getBoolean("active"))
                .membersOnly(doc.getBoolean("membersOnly") != null && doc.getBoolean("membersOnly"))
                .createdAt(createdTimestamp != null ? Instant.ofEpochSecond(createdTimestamp.getSeconds(), createdTimestamp.getNanos()) : null)
                .translations(translations != null ? translations : new HashMap<>())
                .build();
    }
}
