package com.royalbookclub.api.common.exception;

/**
 * Exception thrown when a business rule/policy is violated.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }

    public BusinessRuleException(String message, Throwable cause) {
        super(message, cause);
    }
}
