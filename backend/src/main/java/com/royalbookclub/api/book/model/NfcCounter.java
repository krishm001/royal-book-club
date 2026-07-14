package com.royalbookclub.api.book.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Date;

/**
 * Model representing a physical NFC tap counter and its first-seen timestamp.
 * Maps to the "nfc_counters" collection in Firestore.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NfcCounter {
    private String id; // unique document ID: {uid}_{counter}
    private String uid; // physical NTAG UID
    private String counter; // dynamic NFC counter parameter
    private Date firstSeenAt; // timestamp when this combination was first tapped
}
