const db = require('../config/db');
const mailer = require('../utils/mailer');

async function notifyAccountDecision(account, status) {
  if (!account?.email) return;
  const approved = status === 'Approved';
  try {
    await mailer.sendMail({
      from: `"LGU Gym Reservation System" <${process.env.MAIL_USER}>`,
      to: account.email,
      subject: `LGU Gym Reservation - Account ${approved ? 'Approved' : 'Declined'}`,
      html: `<h2>Account ${approved ? 'Approved' : 'Declined'}</h2>
        <p>Hello ${account.firstname || 'there'},</p>
        <p>Your LGU Gym Reservation System account has been ${approved ? 'approved and can now be used to log in' : 'declined by the administrator'}.</p>
        <p><strong>Status: ${status}</strong></p>
        <p>LGU Gym Reservation System</p>`
    });
  } catch (_) {
    // The saved decision remains authoritative when email delivery is unavailable.
    console.error('Account decision notification could not be delivered.');
  }
}

async function decideAccount(accountId, status) {
  const connection = await db.getConnection();
  let account;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT account_id, account_type, status FROM accounts WHERE account_id = ? FOR UPDATE`,
      [accountId]
    );
    if (!rows.length) {
      await connection.rollback();
      return { outcome: 'not_found' };
    }
    if (rows[0].status !== 'Pending') {
      await connection.rollback();
      return { outcome: 'not_pending', status: rows[0].status };
    }
    const type = rows[0].account_type;
    if (!['Client', 'Personnel'].includes(type)) {
      await connection.rollback();
      return { outcome: 'unsupported' };
    }
    const table = type === 'Client' ? 'clients' : 'personnel';
    const profileStatus = type === 'Client' ? (status === 'Approved' ? 'Active' : 'Inactive') : status;
    const [profiles] = await connection.query(
      `SELECT firstname, email FROM ${table} WHERE account_id = ?`, [accountId]
    );
    const [updated] = await connection.query(
      "UPDATE accounts SET status = ? WHERE account_id = ? AND status = 'Pending'", [status, accountId]
    );
    if (!updated.affectedRows) {
      await connection.rollback();
      return { outcome: 'not_pending' };
    }
    await connection.query(`UPDATE ${table} SET status = ? WHERE account_id = ?`, [profileStatus, accountId]);
    await connection.commit();
    account = profiles[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  await notifyAccountDecision(account, status);
  return { outcome: 'updated' };
}

async function notifyPendingRegistration(email, firstname) {
  if (!email) return;
  try {
    await mailer.sendMail({
      from: `"LGU Gym Reservation System" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'LGU Gym Reservation - Account Pending Approval',
      html: `<h2>Account Registration Successful</h2>
        <p>Hello ${firstname || 'there'},</p>
        <p>Your LGU Gym Reservation System account has been registered.</p>
        <p><strong>Status: Pending Approval</strong></p>
        <p>Please wait for the administrator to review your account.</p>
        <p>LGU Gym Reservation System</p>`
    });
  } catch (_) {
    console.error('Pending account notification could not be delivered.');
  }
}

module.exports = { decideAccount, notifyPendingRegistration };
