package com.royalbookclub.api.hardware.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;
import com.royalbookclub.api.hardware.dto.ShelfEventRequestDto;
import com.royalbookclub.api.hardware.model.ShelfEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/**
 * Service to store physical bookshelf RFID events for asynchronous trigger parsing.
 */
@Service
public class ShelfEventService {

    private static final Logger log = LoggerFactory.getLogger(ShelfEventService.class);
    private static final String COLLECTION_NAME = "shelf_events";

    private final Firestore firestore;

    public ShelfEventService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Parse and record a physical RFID shelf scanning interaction.
     *
     * @param request Payload containing Shelf ID, Member RFID token, and Book RFID token
     * @return The persisted ShelfEvent model details
     */
    public ShelfEvent recordShelfEvent(ShelfEventRequestDto request) {
        String eventId = UUID.randomUUID().toString();
        log.info("Recording raw shelf RFID event. Event ID: {}, Shelf: {}, Member RFID: {}, Book RFID: {}",
                eventId, request.getShelfId(), request.getMemberRfid(), request.getBookRfid());

        ShelfEvent event = ShelfEvent.builder()
                .id(eventId)
                .shelfId(request.getShelfId().trim())
                .memberRfid(request.getMemberRfid().trim())
                .bookRfid(request.getBookRfid().trim())
                .timestamp(Instant.now())
                .build();

        try {
            DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(eventId);
            ApiFuture<WriteResult> writeFuture = docRef.set(eventToMap(event));
            writeFuture.get(); // block to verify completion
            log.info("Successfully recorded shelf event to database. Event ID: {}", eventId);
            return event;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Recording shelf event interrupted. ID: {}", eventId, e);
            throw new RuntimeException("Failed to save shelf event", e);
        } catch (ExecutionException e) {
            log.error("Failed to save shelf event to database. ID: {}", eventId, e);
            throw new RuntimeException("Failed to save shelf event", e);
        }
    }

    private Map<String, Object> eventToMap(ShelfEvent event) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", event.getId());
        map.put("shelfId", event.getShelfId());
        map.put("memberRfid", event.getMemberRfid());
        map.put("bookRfid", event.getBookRfid());
        map.put("timestamp", event.getTimestamp() != null ? com.google.cloud.Timestamp.ofTimeSecondsAndNanos(event.getTimestamp().getEpochSecond(), event.getTimestamp().getNano()) : null);
        return map;
    }
}
