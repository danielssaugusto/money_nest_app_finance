package org.example.service;

import org.example.model.Transaction;
import org.example.model.TransactionType;
import org.example.model.User;
import org.example.repository.TransactionRepository;
import org.example.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private TransactionService transactionService;

    private User testUser;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = User.builder()
                .id("user-123")
                .email("test@example.com")
                .name("Test User")
                .build();

        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
    }

    @Test
    void shouldCreateTransactionSuccessfully() {
        Transaction transaction = Transaction.builder()
                .id("t-1")
                .amount(new BigDecimal("100.00"))
                .type(TransactionType.INCOME)
                .user(testUser)
                .build();

        when(transactionRepository.save(any(Transaction.class))).thenReturn(transaction);

        Transaction result = transactionService.create(
                new BigDecimal("100.00"),
                "Salário",
                "INCOME",
                "Nubank"
        );

        assertNotNull(result);
        assertEquals(new BigDecimal("100.00"), result.getAmount());
        assertEquals(testUser, result.getUser());
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    void shouldThrowExceptionWhenAmountIsZero() {
        assertThrows(IllegalArgumentException.class, () -> {
            transactionService.create(BigDecimal.ZERO, "Teste", "INCOME", "Bank");
        });
    }

    @Test
    void shouldThrowExceptionWhenTypeIsInvalid() {
        assertThrows(IllegalArgumentException.class, () -> {
            transactionService.create(new BigDecimal("10.00"), "Teste", "INVALID", "Bank");
        });
    }
}
