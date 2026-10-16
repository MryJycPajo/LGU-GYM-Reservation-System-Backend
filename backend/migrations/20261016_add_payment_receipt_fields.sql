ALTER TABLE payment_transactions
    ADD COLUMN remarks VARCHAR(500) NULL,
    ADD COLUMN created_at DATETIME NULL;

UPDATE payment_transactions
SET created_at = payment_date
WHERE created_at IS NULL;

ALTER TABLE payment_transactions
    MODIFY COLUMN created_at DATETIME NOT NULL;
