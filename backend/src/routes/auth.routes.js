const express = require('express');
const router = express.Router();
const db = require('../config/db');

// LOGIN
router.post('/login', async (req, res) => {

  console.log("Login Request:", req.body);

  const { username, password } = req.body;

  console.log("BODY:", req.body);
console.log("USERNAME:", username);
console.log("PASSWORD:", password);

  try {

    // ADMIN
    const [admins] = await db.query(
      'SELECT * FROM admins WHERE username = ? AND password = ?',
      [username, password]
    );

    if (admins.length > 0) {
      return res.json({
        success: true,
        role: 'admin',
        user: admins[0]
      });
    }

    // PERSONNEL
    const [personnel] = await db.query(
      'SELECT * FROM personnel WHERE username = ? AND password = ?',
      [username, password]
    );

    if (personnel.length > 0) {
      return res.json({
        success: true,
        role: 'personnel',
        status: personnel[0].status,
        user: personnel[0]
      });
    }

// CLIENT
const [clients] = await db.query(
    `SELECT * FROM clients
     WHERE username = ?
     AND password = ?`,
    [username, password]
);

if (clients.length > 0) {

    if (clients[0].status !== 'Active') {
        return res.json({
            success: false,
            message: 'Your client account is not yet approved.'
        });
    }

    return res.json({
        success: true,
        role: 'client',
        user: clients[0]
    });
}

    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }

});

// GET ALL PENDING CLIENT ACCOUNTS
router.get('/pending-clients', async (req, res) => {

    try {

        const [clients] = await db.query(`
            SELECT
                c.account_id,
                c.lastname,
                c.firstname,
                c.email,
                a.status
            FROM clients c
            INNER JOIN accounts a
                ON c.account_id = a.account_id
            WHERE a.account_type = 'Client'
              AND a.status = 'Pending'
        `);

        res.json({
            success: true,
            clients
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// ADMIN DASHBOARD COUNTS
router.get('/dashboard', async (req, res) => {

    try {

        const [[clientCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM clients"
        );

        const [[personnelCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM personnel"
        );

        const [[pendingCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM accounts WHERE status='Pending'"
        );

        const [[approvedCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM accounts WHERE status='Approved'"
        );

        res.json({
            success: true,
            totalClients: clientCount.total,
            totalPersonnel: personnelCount.total,
            pending: pendingCount.total,
            approved: approvedCount.total
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// GET ALL USER ACCOUNTS
router.get('/accounts', async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT
                a.account_id,
                a.account_type,
                a.status,
                COALESCE(c.firstname, p.firstname) AS firstname,
                COALESCE(c.lastname, p.lastname) AS lastname,
                COALESCE(c.email, p.email) AS email,
                p.position
            FROM accounts a
            LEFT JOIN clients c
                ON a.account_id = c.account_id
            LEFT JOIN personnel p
                ON a.account_id = p.account_id
            ORDER BY a.account_type, lastname
        `);

        res.json({
            success: true,
            users: rows
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
});

router.put('/approve/:id', async (req, res) => {

    const { id } = req.params;

    try {

        await db.query(
            "UPDATE accounts SET status='Approved' WHERE account_id=?",
            [id]
        );

        await db.query(
            "UPDATE clients SET status='Active' WHERE account_id=?",
            [id]
        );

        await db.query(
            "UPDATE personnel SET status='Approved' WHERE account_id=?",
            [id]
        );

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

router.put('/decline/:id', async (req, res) => {

    const { id } = req.params;

    try {

        await db.query(
            "UPDATE accounts SET status='Declined' WHERE account_id=?",
            [id]
        );

        await db.query(
            "UPDATE clients SET status='Inactive' WHERE account_id=?",
            [id]
        );

        await db.query(
            "UPDATE personnel SET status='Declined' WHERE account_id=?",
            [id]
        );

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// GET CLIENT ACCOUNTS FOR PERSONNEL
router.get('/clients', async (req, res) => {

    try {

        const [clients] = await db.query(`
            SELECT
                a.account_id,
                a.status,
                c.firstname,
                c.lastname,
                c.email,
                c.phone_number,
                c.address
            FROM accounts a
            INNER JOIN clients c
                ON a.account_id = c.account_id
            WHERE a.account_type = 'Client'
            ORDER BY c.lastname ASC
        `);


        res.json({
            success: true,
            clients
        });


    } catch(err) {

        console.error(err);

        res.status(500).json({
            success:false,
            message:err.message
        });

    }

});

module.exports = router;