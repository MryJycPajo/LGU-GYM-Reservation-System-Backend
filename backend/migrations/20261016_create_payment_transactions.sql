CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reservation_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATETIME NOT NULL,
    payment_method VARCHAR(40) NOT NULL,
    reference_number VARCHAR(120) NULL,
    recorded_by VARCHAR(64) NULL,
    PRIMARY KEY (transaction_id),
    UNIQUE KEY uq_payment_transactions_reservation (reservation_id),
    KEY idx_payment_transactions_payment_date (payment_date)
);
