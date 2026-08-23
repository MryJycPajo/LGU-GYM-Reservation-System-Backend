const express = require('express');
const router = express.Router();
const db = require('../config/db');


// PERSONNEL CREATE CLIENT ACCOUNT
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
    username,
    password
} = req.body;


    try {

        // Generate 6 digit account ID
        const account_id = Math.floor(100000 + Math.random() * 900000)
            .toString();


        // Save account first
        await db.query(
            `INSERT INTO accounts
            (
                account_id,
                username,
                password,
                account_type,
                status
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                account_id,
                username,
                password,
                'Client',
                'Pending'
            ]
        );


        // Save client profile
await db.query(
    `INSERT INTO clients
    (
        account_id,
        lastname,
        firstname,
        middlename,
        address,
        gender,
        birthdate,
        email,
        phone_number,
        username,
        password,
        status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        account_id,
        lastname,
        firstname,
        middlename,
        address,
        gender,
        birthdate,
        email,
        phone,
        username,
        password,
        'Inactive'
    ]
);

        res.json({
            success: true,
            message: 'Client account created. Waiting for admin approval.',
            account_id: account_id
        });


    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// =========================================
// UPDATE CLIENT PROFILE
// =========================================
router.put('/clients/:account_id', async (req, res) => {
    const { account_id } = req.params;

    const {
        lastname,
        firstname,
        middlename,
        birthdate,
        gender,
        address,
        email,
        phone_number,
        username
    } = req.body;

    // Check required fields
    if (
        !lastname ||
        !firstname ||
        !birthdate ||
        !gender ||
        !address ||
        !email ||
        !phone_number ||
        !username
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please fill in all required fields.'
        });
    }

    try {

        // Check if client exists
        const [clients] = await db.query(
            `SELECT * FROM clients WHERE account_id = ?`,
            [account_id]
        );

        if (clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client profile not found.'
            });
        }

        // Update clients table
        await db.query(
            `UPDATE clients
             SET
                lastname = ?,
                firstname = ?,
                middlename = ?,
                birthdate = ?,
                gender = ?,
                address = ?,
                email = ?,
                phone_number = ?,
                username = ?
             WHERE account_id = ?`,
            [
                lastname,
                firstname,
                middlename,
                birthdate,
                gender,
                address,
                email,
                phone_number,
                username,
                account_id
            ]
        );

        // Update username in accounts table too
        await db.query(
            `UPDATE accounts
             SET username = ?
             WHERE account_id = ?`,
            [
                username,
                account_id
            ]
        );

        return res.json({
            success: true,
            message: 'Profile updated successfully.'
        });

    } catch (err) {

        console.error('Update client profile error:', err);

        return res.status(500).json({
            success: false,
            message: 'Server error while updating client profile.'
        });
    }
});

module.exports = router;