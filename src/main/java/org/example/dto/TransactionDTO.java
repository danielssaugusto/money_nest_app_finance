package org.example.dto;

import java.math.BigDecimal;

public class TransactionDTO {
    private BigDecimal amount;
    private String description;
    private String type;
    private String bank;

    public BigDecimal getAmount() { return amount; }
    public String getDescription() { return description; }
    public String getType() { return type; }

    public String getBank() {
        return bank;
    }
}
