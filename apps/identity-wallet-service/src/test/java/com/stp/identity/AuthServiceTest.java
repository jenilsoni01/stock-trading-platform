package com.stp.identity;

import com.stp.identity.dto.AuthDto;
import com.stp.identity.entity.User;
import com.stp.identity.entity.WalletAccount;
import com.stp.identity.repository.UserRepository;
import com.stp.identity.repository.WalletAccountRepository;
import com.stp.identity.repository.WalletLedgerRepository;
import com.stp.identity.security.JwtTokenProvider;
import com.stp.identity.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private WalletAccountRepository walletRepository;

    @Mock
    private WalletLedgerRepository ledgerRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    @Test
    void register_ShouldCreateUserAndInitialWallet() {
        AuthDto.RegisterRequest request = new AuthDto.RegisterRequest(
                "trader1",
                "trader1@example.com",
                "Password123!",
                "Trader One"
        );

        UUID testUserId = UUID.randomUUID();
        when(userRepository.existsByUsername("trader1")).thenReturn(false);
        when(userRepository.existsByEmail("trader1@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("hashed_pass");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(testUserId);
            return u;
        });
        when(jwtTokenProvider.generateToken(any(UUID.class), anyString(), anyString())).thenReturn("mocked_jwt");

        AuthDto.AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("trader1", response.user().username());
        assertEquals("mocked_jwt", response.token());
        verify(walletRepository, times(1)).save(any(WalletAccount.class));
    }
}
