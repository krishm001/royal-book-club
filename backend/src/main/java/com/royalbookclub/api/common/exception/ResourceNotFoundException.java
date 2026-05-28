package com.royalbookclub.api.common.exception;

/**
 * Exception thrown when a requested resource is not found in Cloud Firestore.
 */
public class ResourceNotFoundException extends RuntimeException {
    
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
