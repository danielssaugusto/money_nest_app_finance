package org.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.model.Transaction;
import org.example.model.TransactionType;
import org.example.model.User;
import org.example.repository.TransactionRepository;
import org.example.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository repository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + email));
    }

    @Transactional
    public Transaction create(BigDecimal amount, String description, String type, String bank) {
        validateAmount(amount);
        User user = getCurrentUser();

        Transaction transaction = Transaction.builder()
                .user(user)
                .amount(amount.setScale(2, RoundingMode.HALF_UP))
                .description(description)
                .type(parseType(type))
                .bank(bank)
                .build();

        return repository.save(transaction);
    }

    public List<Transaction> listAll() {
        User user = getCurrentUser();
        return repository.findAll().stream()
                .filter(t -> t.getUser() != null && t.getUser().getId().equals(user.getId()))
                .collect(Collectors.toList());
    }

    public BigDecimal getBalance() {
        return listAll().stream()
                .map(this::applySignal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O valor deve ser maior que zero");
        }
    }

    private TransactionType parseType(String type) {
        try {
            return TransactionType.valueOf(type.toUpperCase());
        } catch (Exception e) {
            return TransactionType.EXPENSE; // Fallback seguro
        }
    }

    @Transactional
    public Transaction update(String id, BigDecimal amount, String description, String type, String bank) {
        try {
            User user = getCurrentUser();
            Transaction transaction = repository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Transação " + id + " não encontrada"));

            // Verificação simplificada de segurança
            if (transaction.getUser() != null && !transaction.getUser().getId().equals(user.getId())) {
                throw new SecurityException("Acesso negado a esta transação");
            }

            validateAmount(amount);
            
            transaction.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
            transaction.setDescription(description != null ? description : "");
            transaction.setBank(bank != null ? bank : "");
            transaction.setType(parseType(type));
            
            if (transaction.getUser() == null) transaction.setUser(user);

            return repository.save(transaction);
        } catch (Exception e) {
            log.error("ERRO CRÍTICO NA ATUALIZAÇÃO: ", e);
            throw new RuntimeException("Erro ao salvar alterações: " + e.getMessage());
        }
    }

    @Transactional
    public void delete(String id) {
        User user = getCurrentUser();
        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transação não encontrada"));

        if (transaction.getUser() != null && !transaction.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Acesso negado");
        }

        repository.delete(transaction);
    }

    private BigDecimal applySignal(Transaction t) {
        return t.getType() == TransactionType.INCOME
                ? t.getAmount()
                : t.getAmount().negate();
    }
}