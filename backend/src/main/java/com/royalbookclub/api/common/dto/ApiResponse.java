package com.royalbookclub.api.common.dto;

import java.time.Instant;

/**
 * Standard API response envelope using Java 21 Record.
 *
 * @param success Indicates if the operation was successful
 * @param message User-friendly status message
 * @param data Payload of the response
 * @param timestamp Timestamp when response was created
 * @param <T> Type of the data payload
 */
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        Instant timestamp
) {
    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, message, data, Instant.now());
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, "Operation completed successfully");
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, Instant.now());
    }
}
