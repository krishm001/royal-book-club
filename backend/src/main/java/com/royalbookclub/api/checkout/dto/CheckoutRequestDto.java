package com.royalbookclub.api.checkout.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for checking out a book.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequestDto {

    @NotBlank(message = "Book ID (ISBN) is required")
    private String bookId;

    @NotBlank(message = "Member ID is required")
    private String memberId;

    @Builder.Default
    private int durationDays = 14; // Default checkout window: 2 weeks

    private String ntagUid;
}
