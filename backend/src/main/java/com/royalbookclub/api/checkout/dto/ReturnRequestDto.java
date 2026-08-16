package com.royalbookclub.api.checkout.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for returning a book.
 * Can be processed via specific Checkout ID or Book/Member combination.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequestDto {

    private String checkoutId;

    @NotBlank(message = "Book ID (ISBN) is required")
    private String bookId;

    @NotBlank(message = "Member ID is required")
    private String memberId;

    private String ntagUid;

    private String memberEmail;
    private String memberName;

    private Double returnLatitude;
    private Double returnLongitude;
    private String nfcOrBarcode; // e.g. "NFC" or "BARCODE"
    private String scannedQrPath;
}

