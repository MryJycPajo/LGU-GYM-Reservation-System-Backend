const bcrypt = require('bcryptjs');

const ACCOUNT_TABLE_BY_ROLE = {
  personnel: 'personnel',
  client: 'clients'
};

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value);
}

async function passwordMatches(input, stored) {
  if (typeof input !== 'string' || typeof stored !== 'string') return false;
  if (isBcryptHash(stored)) return bcrypt.compare(input, stored);
  return input === stored;
}

async function verifyAndMigratePassword({ db, role, user, input }) {
  if (!await passwordMatches(input, user.password)) {
    return { matches: false, upgraded: false };
  }

  if (isBcryptHash(user.password)) {
    return { matches: true, upgraded: false };
  }

  const table = ACCOUNT_TABLE_BY_ROLE[role];
  const idColumn = role === 'admin' ? 'admin_id' : 'account_id';
  const id = role === 'admin' ? (user.admin_id ?? user.id) : user.account_id;

  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Login reads these same rows. Lock and recheck them to handle concurrent logins
      // and ensure a password reset cannot be overwritten by an older login request.
      const [tables] = await connection.query(
        `SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?, ?)`,
        table ? [table, 'accounts'] : ['admins', 'admins']
      );
      const requiredTables = table ? [table, 'accounts'] : ['admins'];
      if (requiredTables.some(name => !tables.some(row => row.TABLE_NAME === name && row.ENGINE === 'InnoDB'))) {
        throw new Error('Password tables must use InnoDB before password migration.');
      }

      const [currentRows] = await connection.query(
        `SELECT password FROM ${table || 'admins'} WHERE ${idColumn} = ? FOR UPDATE`,
        [id]
      );
      if (!currentRows.length || !await passwordMatches(input, currentRows[0].password)) {
        await connection.rollback();
        return { matches: false, upgraded: false };
      }

      const passwordHash = await bcrypt.hash(input, 10);
      const [profileUpdate] = await connection.query(
        `UPDATE ${table || 'admins'} SET password = ? WHERE ${idColumn} = ?`,
        [passwordHash, id]
      );
      if (profileUpdate.affectedRows !== 1) throw new Error('Password migration did not update its source row.');

      if (table) {
        const [accountRows] = await connection.query(
          'SELECT account_id FROM accounts WHERE account_id = ? FOR UPDATE',
          [user.account_id]
        );
        if (!accountRows.length) throw new Error('Password migration account row is missing.');
        const [accountUpdate] = await connection.query(
          'UPDATE accounts SET password = ? WHERE account_id = ?',
          [passwordHash, user.account_id]
        );
        if (accountUpdate.affectedRows !== 1) throw new Error('Password migration did not update its account row.');
      }

      await connection.commit();
      return { matches: true, upgraded: true };
    } catch (error) {
      try { await connection.rollback(); } catch (_) { /* Preserve the original failure. */ }
      throw error;
    } finally {
      connection.release();
    }
  } catch (_) {
    // Authentication remains available while an upgrade is unavailable. Never log
    // credential data or claim the upgrade succeeded; a later login can retry it.
    console.error('Legacy password migration could not be completed.');
    return { matches: true, upgraded: false };
  }
}

module.exports = { isBcryptHash, passwordMatches, verifyAndMigratePassword };
