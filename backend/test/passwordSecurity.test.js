const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { verifyAndMigratePassword } = require('../src/services/passwordSecurity');

function makeDb({ profilePassword, accountPassword, failAccountUpdate = false }) {
  const state = { profilePassword, accountPassword, committed: false, rolledBack: false };
  const connection = {
    async beginTransaction() {},
    async commit() { state.committed = true; },
    async rollback() { state.rolledBack = true; },
    release() {},
    async query(sql, params) {
      if (sql.includes('information_schema.TABLES')) {
        return [[{ TABLE_NAME: 'clients', ENGINE: 'InnoDB' }, { TABLE_NAME: 'accounts', ENGINE: 'InnoDB' }]];
      }
      if (sql.includes('SELECT password FROM clients')) return [[{ password: state.profilePassword }]];
      if (sql.includes('SELECT account_id FROM accounts')) return [[{ account_id: '123456' }]];
      if (sql.includes('UPDATE clients')) {
        state.profilePassword = params[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('UPDATE accounts')) {
        if (failAccountUpdate) throw new Error('database update failed');
        state.accountPassword = params[0];
        return [{ affectedRows: 1 }];
      }
      throw new Error('Unexpected query');
    }
  };
  return { state, db: { async getConnection() { return connection; } } };
}

test('legacy plaintext login succeeds and upgrades client and account rows atomically', async () => {
  const { state, db } = makeDb({ profilePassword: 'legacy-value', accountPassword: 'legacy-value' });
  const result = await verifyAndMigratePassword({
    db, role: 'client', user: { account_id: '123456', password: 'legacy-value' }, input: 'legacy-value'
  });

  assert.deepEqual(result, { matches: true, upgraded: true });
  assert.equal(state.committed, true);
  assert.equal(state.rolledBack, false);
  assert.match(state.profilePassword, /^\$2[aby]\$/);
  assert.equal(state.accountPassword, state.profilePassword);
  assert.equal(await bcrypt.compare('legacy-value', state.profilePassword), true);
});

test('bcrypt login succeeds without attempting a migration', async () => {
  const hash = await bcrypt.hash('current-password', 10);
  const result = await verifyAndMigratePassword({
    db: { async getConnection() { throw new Error('should not connect'); } },
    role: 'client', user: { account_id: '123456', password: hash }, input: 'current-password'
  });

  assert.deepEqual(result, { matches: true, upgraded: false });
});

test('failed mirrored update rolls back and does not claim the upgrade succeeded', async () => {
  const { state, db } = makeDb({
    profilePassword: 'legacy-value', accountPassword: 'legacy-value', failAccountUpdate: true
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await verifyAndMigratePassword({
      db, role: 'client', user: { account_id: '123456', password: 'legacy-value' }, input: 'legacy-value'
    });
    assert.deepEqual(result, { matches: true, upgraded: false });
    assert.equal(state.rolledBack, true);
    assert.equal(state.committed, false);
    assert.equal(state.accountPassword, 'legacy-value');
  } finally {
    console.error = originalError;
  }
});
