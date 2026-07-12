package com.royalbookclub.api.checkout.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Model representing a book checkout transaction.
 * Maps to the "checkouts" collection in Firestore.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Checkout {
    private String id;
    private String bookId; // ISBN
    private String memberId;
    private Instant checkedOutAt;
    private Instant dueDate;
    private Instant returnedAt;
    private String status; // "REQUESTED_CHECKOUT", "CHECKED_OUT", "REQUESTED_RETURN", "RETURNED", "REJECTED"
    private Instant requestedAt;
    private Instant approvedAt;
    private String approvedBy;
    private String ntagUid;
    private String memberEmail;
    private String memberName;
    private Double returnLatitude;
    private Double returnLongitude;
    private Boolean locationVerified;
    private String nfcOrBarcode;
}

