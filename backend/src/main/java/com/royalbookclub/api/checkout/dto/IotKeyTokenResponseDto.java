package com.royalbookclub.api.checkout.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Data Transfer Object containing the simulated time-bound IoT unlock key token.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IotKeyTokenResponseDto {
    private String keyToken;
    private Instant expiresAt;
    private String memberId;
    private String bookId;
    private String status;
}
