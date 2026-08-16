const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/pending', async (req, res) => {

    try {

        const [accounts] = await db.query(`
            SELECT
                account_id,
                username,
                account_type,
                status
            FROM accounts
            WHERE status = 'Pending'
            ORDER BY account_id DESC
        `);

        const pendingAccounts = [];

        for (const account of accounts) {

            if (account.account_type === 'Personnel') {

                const [personnel] = await db.query(
                    `
                    SELECT
                        account_id,
                        firstname,
                        lastname,
                        middlename,
                        position,
                        email,
                        phone,
                        status
                    FROM personnel
                    WHERE account_id = ?
                    `,
                    [account.account_id]
                );

                if (personnel.length > 0) {

                    pendingAccounts.push({
                        ...personnel[0],
                        account_type: 'Personnel'
                    });

                }

            } else if (account.account_type === 'Client') {

                const [clients] = await db.query(
                    `
                    SELECT
                        account_id,
                        firstname,
                        lastname,
                        middlename,
                        email,
                        phone_number,
                        status
                    FROM clients
                    WHERE account_id = ?
                    `,
                    [account.account_id]
                );

                if (clients.length > 0) {

                    pendingAccounts.push({
                        ...clients[0],
                        account_type: 'Client'
                    });

                }

            }

        }

        res.json({
            success: true,
            accounts: pendingAccounts
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