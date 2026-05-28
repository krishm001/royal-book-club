package com.royalbookclub.api.hardware.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Model representing an RFID shelf interaction event.
 * Maps to the "shelf_events" collection in Firestore.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShelfEvent {
    private String id;
    private String shelfId;
    private String memberRfid;
    private String bookRfid;
    private Instant timestamp;
}
