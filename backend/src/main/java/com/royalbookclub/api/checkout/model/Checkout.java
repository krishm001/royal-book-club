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
    private Integer copyNo;
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
    private Integer experienceRating; // 1 to 5 stars user experience rating
    private String returnValidationMethod; // "GEOFENCING", "QR_VALIDATOR", "MANUAL_CURATOR"
    private Boolean qrVerified;
}

