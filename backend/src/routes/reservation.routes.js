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
            `INSERT INTO reservations
            (
                account_id,
                service,
                reservation_date,
                reservation_time,
                reservation_details,
                status,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, 'Pending', 'Unpaid')`,
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

        console.error('Reservation error:', error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});

module.exports = router;