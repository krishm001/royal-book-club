package com.royalbookclub.api.book.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a specific physical copy of a book catalog item.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookCopy {
    private Integer copyNo;            // 1-indexed identifier for copy
    private String ntagUid;            // Optional NFC Tag UID bound to this physical copy
    private Long qrId;                 // Optional globally unique 9-digit physical QR code ID
    private String status;             // "AVAILABLE", "CHECKED_OUT", "REQUESTED_CHECKOUT", "REQUESTED_RETURN"
    private String currentCheckoutId;  // Associated active transaction ID
}
