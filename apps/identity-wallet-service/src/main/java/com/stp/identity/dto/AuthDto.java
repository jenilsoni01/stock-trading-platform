package com.stp.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDto {

    /**
     * Registration request
     */
    public record RegisterRequest(
            @NotBlank(message = "Username is required")
            @Size(min = 3, max = 50, message = "Username must be 3-50 characters")
            String username,

            @NotBlank(message = "Email is required")
            @Email(message = "Email must be valid")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 8, max = 100, message = "Password must be 8-100 characters")
            String password,

            @NotBlank(message = "Full name is required")
            @Size(min = 1, max = 100, message = "Full name must be 1-100 characters")
            String fullName
    ) {}

    /**
     * Login request
     */
    public record LoginRequest(
            @NotBlank(message = "Username is required")
            String username,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    /**
     * Authentication response with JWT token
     */
    public record AuthResponse(
            String token,
            String tokenType,
            long expiresIn,
            UserResponse user
    ) {
        public AuthResponse(String token, long expiresIn, UserResponse user) {
            this(token, "Bearer", expiresIn, user);
        }
    }

    /**
     * User profile response
     */
    public record UserResponse(
            String id,
            String username,
            String email,
            String fullName,
            String role,
            String createdAt
    ) {}
}
