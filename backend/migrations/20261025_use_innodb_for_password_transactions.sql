-- Login-time password upgrades update mirrored client/personnel credentials atomically.
-- MyISAM ignores transactions, so convert each password-bearing account table first.
ALTER TABLE accounts ENGINE = InnoDB;
ALTER TABLE admins ENGINE = InnoDB;
ALTER TABLE personnel ENGINE = InnoDB;
ALTER TABLE clients ENGINE = InnoDB;
