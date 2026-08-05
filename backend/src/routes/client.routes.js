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


module.exports = router;