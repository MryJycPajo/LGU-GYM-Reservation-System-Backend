const express = require('express');
const router = express.Router();
const db = require('../config/db');

// =====================================
// CREATE RESERVATION
// =====================================

router.post('/', async (req, res) => {

    const {
        account_id,
        service,
        reservation_date,
        reservation_time,
        reservation_details
    } = req.body;

    try {

        if (
            !account_id ||
            !service ||
            !reservation_date ||
            !reservation_time
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please complete all required fields.'
            });
        }

        const [result] = await db.query(
            `
            INSERT INTO reservations
            (
                account_id,
                service,
                reservation_date,
                reservation_time,
                reservation_details,
                status,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, 'Pending', 'Unpaid')
            `,
            [
                account_id,
                service,
                reservation_date,
                reservation_time,
                reservation_details || null
            ]
        );

        res.json({
            success: true,
            message: 'Reservation submitted successfully.',
            reservation_id: result.insertId
        });

    } catch (error) {

        console.error(
            'Reservation error:',
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// =====================================
// GET ALL RESERVATIONS - ADMIN
// =====================================

router.get('/', async (req, res) => {

    try {

        const [reservations] = await db.query(
            `
            SELECT
                r.reservation_id,
                r.account_id,
                r.service,
                r.reservation_date,
                r.reservation_time,
                r.reservation_details,
r.status,
r.payment_status,
r.amount,
r.payment_date,
r.created_at,

                CONCAT(
                    c.firstname,
                    ' ',
                    c.lastname
                ) AS client_name

            FROM reservations r

            LEFT JOIN clients c
                ON r.account_id = c.account_id

            ORDER BY
                r.reservation_date DESC,
                r.reservation_time DESC
            `
        );

        res.json({
            success: true,
            reservations
        });

    } catch (error) {

        console.error(
            'Get all reservations error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server error while loading reservations.'
        });
    }
});

// =====================================
// GET CLIENT RESERVATIONS
// =====================================

router.get('/:account_id', async (req, res) => {

    const { account_id } = req.params;

    try {

        const [reservations] = await db.query(`
            SELECT
                reservation_id,
                account_id,
                service,
                reservation_date,
                reservation_time,
                reservation_details,
                status,
                payment_status,
                amount,
                payment_date,
                created_at
            FROM reservations
            WHERE account_id = ?
            ORDER BY
                reservation_date DESC,
                reservation_time DESC
        `, [account_id]);


        res.json({
            success: true,
            reservations
        });


    } catch (error) {

        console.error(
            'Get client reservations error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Server error while loading reservations.'
        });
    }
});


// =====================================
// UPDATE RESERVATION STATUS - ADMIN
// =====================================

router.put('/:reservation_id/status', async (req, res) => {
    const { reservation_id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
        'Approved',
        'Declined',
        'Completed'
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid reservation status.'
        });
    }

    try {
        const [result] = await db.query(
            `
            UPDATE reservations
            SET status = ?
            WHERE reservation_id = ?
            `,
            [status, reservation_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found.'
            });
        }

        res.json({
            success: true,
            message: `Reservation ${status.toLowerCase()} successfully.`,
            status
        });

    } catch (error) {
        console.error(
            'Update reservation status error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server error while updating reservation status.'
        });
    }
});

// =====================================
// UPDATE PAYMENT STATUS - ADMIN
// =====================================

router.put('/:reservation_id/payment', async (req, res) => {
    const { reservation_id } = req.params;
    const { payment_status } = req.body;

    const allowedPaymentStatuses = [
        'Paid',
        'Unpaid'
    ];

    if (!allowedPaymentStatuses.includes(payment_status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment status.'
        });
    }

    try {
const [result] = await db.query(
    `
    UPDATE reservations
    SET
        payment_status = ?,
        payment_date = CASE
            WHEN ? = 'Paid' THEN NOW()
            ELSE NULL
        END
    WHERE reservation_id = ?
    `,
    [
        payment_status,
        payment_status,
        reservation_id
    ]
);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found.'
            });
        }

        res.json({
            success: true,
            message: `Payment marked as ${payment_status}.`,
            payment_status
        });

    } catch (error) {
        console.error(
            'Update payment status error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Server error while updating payment status.'
        });
    }
});

module.exports = router;