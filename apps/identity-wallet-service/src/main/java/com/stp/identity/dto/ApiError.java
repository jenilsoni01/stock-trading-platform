package com.stp.identity.dto;

/**
 * Standard API error response format.
 * Used across all services for consistent error reporting.
 */
public record ApiError(
        String error,
        String message,
        int status,
        String timestamp,
        String path
) {}
