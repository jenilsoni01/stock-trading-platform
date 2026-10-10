package com.stp.identity.controller;

import com.stp.identity.dto.AuthDto;
import com.stp.identity.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Authentication controller — public endpoints for registration and login.
 */
@RestController
@RequestMapping("/api/v1")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Register a new user.
     * Creates user account with wallet and initial balance.
     */
    @PostMapping("/auth/register")
    public ResponseEntity<AuthDto.AuthResponse> register(@Valid @RequestBody AuthDto.RegisterRequest request) {
        log.info("Registration request: username={}", request.username());
        AuthDto.AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Login with username and password.
     * Returns JWT token on success.
     */
    @PostMapping("/auth/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        log.info("Login request: username={}", request.username());
        AuthDto.AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get current user's profile.
     * Requires valid JWT — user ID is extracted from SecurityContext, never from client input.
     */
    @GetMapping("/users/me")
    public ResponseEntity<AuthDto.UserResponse> getCurrentUser(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        AuthDto.UserResponse response = authService.getUserProfile(userId);
        return ResponseEntity.ok(response);
    }
}
