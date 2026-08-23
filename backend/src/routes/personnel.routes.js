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

router.get('/pending', async (req, res) => {

    try {

        const [rows] = await db.query(
            `SELECT
                account_id,
                lastname,
                firstname,
                middlename,
                position,
                status
             FROM personnel
             WHERE status = 'Pending'
             ORDER BY personnel_id DESC`
        );

        res.json({
            success: true,
            accounts: rows
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// =====================================
// UPDATE PERSONNEL PROFILE
// =====================================
router.put('/profile/:account_id', async (req, res) => {
    const { account_id } = req.params;

    const {
        lastname,
        firstname,
        middlename,
        birthdate,
        gender,
        address,
        phone,
        email
    } = req.body;

    try {
        const [result] = await db.query(
            `
            UPDATE personnel
            SET
                lastname = ?,
                firstname = ?,
                middlename = ?,
                birthdate = ?,
                gender = ?,
                address = ?,
                phone = ?,
                email = ?
            WHERE account_id = ?
            `,
            [
                lastname,
                firstname,
                middlename,
                birthdate,
                gender,
                address,
                phone,
                email,
                account_id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Personnel account not found.'
            });
        }

        // Get updated data from database
        const [rows] = await db.query(
            `
            SELECT
                p.account_id,
                p.personnel_id,
                p.firstname,
                p.lastname,
                p.middlename,
                p.birthdate,
                p.gender,
                p.address,
                p.phone,
                p.email,
                p.position,
                p.username,
                p.status
            FROM personnel p
            WHERE p.account_id = ?
            `,
            [account_id]
        );

        res.json({
            success: true,
            message: 'Personnel profile updated successfully.',
            personnel: rows[0]
        });

    } catch (err) {
        console.error('UPDATE PERSONNEL ERROR:', err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// =====================================
// CHANGE PERSONNEL PASSWORD
// =====================================

router.put('/change-password/:account_id', async (req, res) => {

    const { account_id } = req.params;

    const {
        currentPassword,
        newPassword
    } = req.body;

    try {

        // Get current password
        const [rows] = await db.query(
            `
            SELECT password
            FROM personnel
            WHERE account_id = ?
            `,
            [account_id]
        );

        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Personnel account not found.'
            });

        }

        const currentDatabasePassword =
            rows[0].password;


        // Check current password
        if (currentPassword !== currentDatabasePassword) {

            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect.'
            });

        }


        // Update password
        await db.query(
            `
            UPDATE personnel
            SET password = ?
            WHERE account_id = ?
            `,
            [
                newPassword,
                account_id
            ]
        );


        // Also update accounts table
        await db.query(
            `
            UPDATE accounts
            SET password = ?
            WHERE account_id = ?
            `,
            [
                newPassword,
                account_id
            ]
        );


        res.json({
            success: true,
            message: 'Password changed successfully.'
        });


    } catch (err) {

        console.error(
            'CHANGE PASSWORD ERROR:',
            err
        );

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});
module.exports = router;