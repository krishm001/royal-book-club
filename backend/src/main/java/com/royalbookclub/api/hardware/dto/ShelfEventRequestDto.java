package com.royalbookclub.api.hardware.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object representing the payload emitted by physical RFID shelf readers.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShelfEventRequestDto {

    @NotBlank(message = "Shelf ID is required")
    private String shelfId;

    @NotBlank(message = "Member RFID token is required")
    private String memberRfid;

    @NotBlank(message = "Book RFID token is required")
    private String bookRfid;
}
