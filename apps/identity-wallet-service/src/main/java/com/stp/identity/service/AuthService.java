package com.stp.identity.service;

import com.stp.identity.dto.AuthDto;
import com.stp.identity.entity.User;
import com.stp.identity.entity.WalletAccount;
import com.stp.identity.entity.WalletLedger;
import com.stp.identity.repository.UserRepository;
import com.stp.identity.repository.WalletAccountRepository;
import com.stp.identity.repository.WalletLedgerRepository;
import com.stp.identity.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Authentication service — handles registration and login.
 * 
 * On registration:
 * 1. Validates uniqueness of username and email
 * 2. Hashes password with BCrypt
 * 3. Creates user record
 * 4. Creates wallet account with initial balance
 * 5. Records initial credit in the ledger
 * All within a single ACID transaction.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final WalletAccountRepository walletAccountRepository;
    private final WalletLedgerRepository walletLedgerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final long initialBalancePaise;

    public AuthService(UserRepository userRepository,
                       WalletAccountRepository walletAccountRepository,
                       WalletLedgerRepository walletLedgerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       @Value("${app.wallet.initial-balance-paise}") long initialBalancePaise) {
        this.userRepository = userRepository;
        this.walletAccountRepository = walletAccountRepository;
        this.walletLedgerRepository = walletLedgerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.initialBalancePaise = initialBalancePaise;
    }

    /**
     * Register a new user with wallet.
     * Creates user + wallet + initial ledger entry in one transaction.
     */
    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        // Validate uniqueness
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Create user
        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName());
        user.setRole(User.Role.USER);
        user.setActive(true);
        user = userRepository.save(user);

        // Create wallet with initial balance
        WalletAccount wallet = new WalletAccount();
        wallet.setUserId(user.getId());
        wallet.setAvailableBalancePaise(initialBalancePaise);
        wallet.setReservedBalancePaise(0);
        wallet = walletAccountRepository.save(wallet);

        // Record initial credit in ledger
        WalletLedger ledgerEntry = new WalletLedger();
        ledgerEntry.setWalletId(wallet.getId());
        ledgerEntry.setUserId(user.getId());
        ledgerEntry.setEntryType(WalletLedger.EntryType.CREDIT_INITIAL);
        ledgerEntry.setAmountPaise(initialBalancePaise);
        ledgerEntry.setBalanceAfterPaise(initialBalancePaise);
        ledgerEntry.setReferenceId(user.getId().toString());
        ledgerEntry.setReferenceType("USER_REGISTRATION");
        ledgerEntry.setDescription("Initial paper trading balance");
        ledgerEntry.setIdempotencyKey("initial-" + user.getId());
        walletLedgerRepository.save(ledgerEntry);

        log.info("Registered user: {} with initial balance: {} paise", user.getUsername(), initialBalancePaise);

        // Generate JWT
        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getUsername(), user.getRole().name());

        return new AuthDto.AuthResponse(
                token,
                jwtTokenProvider.getExpirationMs(),
                toUserResponse(user));
    }

    /**
     * Authenticate user and return JWT.
     */
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Account is deactivated");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getUsername(), user.getRole().name());

        log.info("User logged in: {}", user.getUsername());

        return new AuthDto.AuthResponse(
                token,
                jwtTokenProvider.getExpirationMs(),
                toUserResponse(user));
    }

    /**
     * Get user profile by ID.
     */
    public AuthDto.UserResponse getUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return toUserResponse(user);
    }

    private AuthDto.UserResponse toUserResponse(User user) {
        return new AuthDto.UserResponse(
                user.getId().toString(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getCreatedAt().toString());
    }
}
