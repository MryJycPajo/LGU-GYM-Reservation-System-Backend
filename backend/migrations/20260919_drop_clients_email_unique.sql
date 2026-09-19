-- Allow multiple client accounts to use the same email address.
-- This touches only the index named `email` on `clients`; username and
-- account_id indexes/constraints are not changed.
SET @email_index_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'clients'
      AND INDEX_NAME = 'email'
      AND NON_UNIQUE = 0
);

SET @drop_email_index_sql := IF(
    @email_index_exists > 0,
    'ALTER TABLE `clients` DROP INDEX `email`',
    'SELECT ''No unique clients.email index named email exists.'' AS message'
);

PREPARE drop_email_index_statement FROM @drop_email_index_sql;
EXECUTE drop_email_index_statement;
DEALLOCATE PREPARE drop_email_index_statement;
