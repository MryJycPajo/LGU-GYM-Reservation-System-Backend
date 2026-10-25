const express = require('express');
const router = express.Router();
const db = require('../config/db');
const adminAuth = require('../middleware/adminAuth');

router.get('/pending', adminAuth, async (req, res) => {

    try {

        const [accounts] = await db.query(`
            SELECT
                account_id,
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
                        email,
                        status
                    FROM personnel
                    WHERE account_id = ?
                    `,
                    [account.account_id]
                );

                if (personnel.length > 0) {

                    pendingAccounts.push({
                        account_id: account.account_id,
                        firstname: personnel[0].firstname,
                        lastname: personnel[0].lastname,
                        email: personnel[0].email,
                        status: account.status,
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
                        email
                    FROM clients
                    WHERE account_id = ?
                    `,
                    [account.account_id]
                );

                if (clients.length > 0) {

                    pendingAccounts.push({
                        account_id: account.account_id,
                        firstname: clients[0].firstname,
                        lastname: clients[0].lastname,
                        email: clients[0].email,
                        status: account.status,
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
