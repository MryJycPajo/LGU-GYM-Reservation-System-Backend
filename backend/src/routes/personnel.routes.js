const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/register', async (req, res) => {

    const {
        lastname,
        firstname,
        middlename,
        birthdate,
        gender,
        address,
        phone,
        email,
        position,
        username,
        password
    } = req.body;

    try {

        const account_id =
            Math.floor(100000 + Math.random() * 900000).toString();

        await db.query(
            `INSERT INTO accounts
            (account_id, username, password, account_type, status)
            VALUES (?, ?, ?, 'Personnel', 'Pending')`,
            [
                account_id,
                username,
                password
            ]
        );

        await db.query(
            `INSERT INTO personnel
            (
                account_id,
                lastname,
                firstname,
                middlename,
                birthdate,
                gender,
                address,
                phone,
                email,
                position,
                username,
                password,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
            [
                account_id,
                lastname,
                firstname,
                middlename,
                birthdate,
                gender,
                address,
                phone,
                email,
                position,
                username,
                password
            ]
        );

        res.json({
            success: true,
            account_id
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

router.put('/approve/:account_id', async (req, res) => {

    const { account_id } = req.params;

    await db.query(
        "UPDATE personnel SET status='Approved' WHERE account_id=?",
        [account_id]
    );

    await db.query(
        "UPDATE accounts SET status='Approved' WHERE account_id=?",
        [account_id]
    );

    res.json({ success: true });

});

router.put('/decline/:account_id', async (req, res) => {

    const { account_id } = req.params;

    await db.query(
        "UPDATE personnel SET status='Declined' WHERE account_id=?",
        [account_id]
    );

    await db.query(
        "UPDATE accounts SET status='Declined' WHERE account_id=?",
        [account_id]
    );

    res.json({ success: true });

});

module.exports = router;