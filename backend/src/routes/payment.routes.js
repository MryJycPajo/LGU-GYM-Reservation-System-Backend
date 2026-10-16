const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const PAYMENT_METHODS = new Set(['Cash', 'Card', 'Bank Transfer', 'GCash', 'Maya']);

function roleOf(user) {
    return String(user?.role || user?.account_type || '').toLowerCase();
}

function accountIdOf(user) {
    return user?.account_id ?? user?.id ?? user?.sub ?? null;
}

function requireStaff(req, res, next) {
    if (!['admin', 'personnel'].includes(roleOf(req.user))) {
        return res.status(403).json({ success: false, message: 'Admin or Personnel access is required.' });
    }
    next();
}

const paymentAuth = auth();

// Record one full payment for an approved reservation.
router.post('/', paymentAuth, requireStaff, async (req, res) => {
    const reservation_id = req.body.reservation_id ?? req.body.reservationId;
    const payment_method = req.body.payment_method ?? req.body.paymentMethod;
    const payment_date = req.body.payment_date ?? req.body.paymentDate;
    const reference_number = req.body.reference_number ?? req.body.referenceNumber ?? null;
    const remarks = req.body.remarks ?? null;
    const reservationId = Number(reservation_id);

    if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
        return res.status(400).json({ success: false, message: 'A valid reservation_id is required.' });
    }
    if (!PAYMENT_METHODS.has(payment_method)) {
        return res.status(400).json({ success: false, message: 'Unsupported payment method.' });
    }
    if (typeof payment_date !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-][0-2]\d:[0-5]\d)?)?$/.test(payment_date) || Number.isNaN(Date.parse(payment_date))) {
        return res.status(400).json({ success: false, message: 'A valid payment_date is required.' });
    }
    const [year, month, day] = payment_date.slice(0, 10).split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
        return res.status(400).json({ success: false, message: 'A valid payment_date is required.' });
    }
    if (reference_number != null && (typeof reference_number !== 'string' || reference_number.length > 120)) {
        return res.status(400).json({ success: false, message: 'Reference number must be 120 characters or fewer.' });
    }
    if (remarks != null && (typeof remarks !== 'string' || remarks.length > 500)) {
        return res.status(400).json({ success: false, message: 'Remarks must be 500 characters or fewer.' });
    }
    const normalizedPaymentDate = /^\d{4}-\d{2}-\d{2}$/.test(payment_date)
        ? `${payment_date} 00:00:00`
        : new Date(payment_date).toISOString().slice(0, 19).replace('T', ' ');

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [reservations] = await connection.query(
            `SELECT reservation_id, account_id, status, payment_status, amount, reservation_date
             FROM reservations WHERE reservation_id = ? FOR UPDATE`,
            [reservationId]
        );
        if (!reservations.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Reservation not found.' });
        }

        const reservation = reservations[0];
        if (reservation.status !== 'Approved') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'Only approved reservations can be paid.' });
        }
        if (reservation.payment_status !== 'Unpaid') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'Reservation is not unpaid.' });
        }
        const amount = Number(reservation.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'Reservation has no valid stored amount.' });
        }

        const [insert] = await connection.query(
            `INSERT INTO payment_transactions
                (reservation_id, amount, payment_date, payment_method, reference_number, remarks, recorded_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [reservationId, amount.toFixed(2), normalizedPaymentDate, payment_method, reference_number, remarks, accountIdOf(req.user)]
        );
        const [updated] = await connection.query(
            `UPDATE reservations SET payment_status = 'Paid', payment_date = ?
             WHERE reservation_id = ? AND status = 'Approved' AND payment_status = 'Unpaid'`,
            [normalizedPaymentDate, reservationId]
        );
        if (updated.affectedRows !== 1) {
            throw new Error('Reservation payment status changed while recording payment.');
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Payment recorded successfully.',
            transaction: {
                transaction_id: insert.insertId,
                reservation_id: reservationId,
                amount: amount.toFixed(2),
                payment_date: normalizedPaymentDate,
                payment_method,
                reference_number,
                remarks,
                rental_days: 1,
                daily_rate: amount.toFixed(2)
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            try {
                const [existing] = await db.query(
                    'SELECT transaction_id FROM payment_transactions WHERE reservation_id = ? LIMIT 1',
                    [reservationId]
                );
                if (existing.length) {
                    return res.status(409).json({ success: false, message: 'A payment is already recorded for this reservation.' });
                }
            } catch (lookupError) {
                console.error('Check duplicate payment error:', lookupError);
            }
        }
        console.error('Record payment error:', error);
        return res.status(500).json({ success: false, message: 'Server error while recording payment.' });
    } finally {
        if (connection) connection.release();
    }
});

// Payment history is visible to authorized staff.
router.get('/', paymentAuth, requireStaff, async (req, res) => {
    try {
        const [transactions] = await db.query(
            `SELECT p.transaction_id, p.reservation_id, p.amount, p.payment_date,
                    p.payment_method, p.reference_number, p.remarks, p.recorded_by,
                    a.username AS recorded_by_name,
                    r.account_id, r.service, r.reservation_date,
                    1 AS rental_days, p.amount AS daily_rate,
                    CONCAT(c.firstname, ' ', c.lastname) AS client_name
             FROM payment_transactions p
             JOIN reservations r ON r.reservation_id = p.reservation_id
             LEFT JOIN clients c ON c.account_id = r.account_id
             LEFT JOIN accounts a ON a.account_id = p.recorded_by
             ORDER BY p.payment_date DESC, p.transaction_id DESC`
        );
        return res.json({ success: true, transactions });
    } catch (error) {
        console.error('Get payment transactions error:', error);
        return res.status(500).json({ success: false, message: 'Server error while loading payment transactions.' });
    }
});

// Receipt access is limited to staff and the client who owns the reservation.
router.get('/:reservation_id/receipt', paymentAuth, async (req, res) => {
    const reservationId = Number(req.params.reservation_id);
    if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid reservation identifier.' });
    }
    const role = roleOf(req.user);
    if (!['admin', 'personnel', 'client'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    try {
        const [rows] = await db.query(
            `SELECT p.transaction_id, p.reservation_id, p.amount, p.payment_date,
                    p.payment_method, p.reference_number, p.remarks, p.recorded_by,
                    a.username AS recorded_by_name,
                    r.account_id, r.service, r.purpose, r.reservation_date,
                    r.reservation_time, r.end_time, r.status, r.payment_status,
                    1 AS rental_days, p.amount AS daily_rate,
                    CONCAT(c.firstname, ' ', c.lastname) AS client_name
             FROM payment_transactions p
             JOIN reservations r ON r.reservation_id = p.reservation_id
             LEFT JOIN clients c ON c.account_id = r.account_id
             LEFT JOIN accounts a ON a.account_id = p.recorded_by
             WHERE p.reservation_id = ?`,
            [reservationId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Payment receipt not found.' });
        if (role === 'client' && String(rows[0].account_id) !== String(accountIdOf(req.user))) {
            return res.status(403).json({ success: false, message: 'You can only view receipts for your own reservations.' });
        }
        return res.json({ success: true, receipt: rows[0] });
    } catch (error) {
        console.error('Get payment receipt error:', error);
        return res.status(500).json({ success: false, message: 'Server error while loading payment receipt.' });
    }
});

router.get('/transaction/:transaction_id', paymentAuth, async (req, res) => {
    const transactionId = Number(req.params.transaction_id);
    if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid transaction identifier.' });
    }
    const role = roleOf(req.user);
    if (!['admin', 'personnel', 'client'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    try {
        const [rows] = await db.query(
            `SELECT p.transaction_id, p.reservation_id, p.amount, p.payment_date,
                    p.payment_method, p.reference_number, p.remarks, p.recorded_by,
                    a.username AS recorded_by_name, r.account_id, r.service, r.purpose,
                    r.reservation_date, r.reservation_time, r.end_time,
                    1 AS rental_days, p.amount AS daily_rate,
                    CONCAT(c.firstname, ' ', c.lastname) AS client_name
             FROM payment_transactions p
             JOIN reservations r ON r.reservation_id = p.reservation_id
             LEFT JOIN clients c ON c.account_id = r.account_id
             LEFT JOIN accounts a ON a.account_id = p.recorded_by
             WHERE p.transaction_id = ?`,
            [transactionId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Payment receipt not found.' });
        if (role === 'client' && String(rows[0].account_id) !== String(accountIdOf(req.user))) {
            return res.status(403).json({ success: false, message: 'You can only view receipts for your own reservations.' });
        }
        return res.json({ success: true, receipt: rows[0] });
    } catch (error) {
        console.error('Get payment transaction error:', error);
        return res.status(500).json({ success: false, message: 'Server error while loading payment receipt.' });
    }
});

module.exports = router;
