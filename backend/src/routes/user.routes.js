const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET ALL USERS
router.get('/', async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM users");
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ADD USER
router.post('/', async (req, res) => {
  try {
    const { user_fullname, user_name, password, user_type } = req.body;

    const sql = `
      INSERT INTO users (user_fullname, user_name, password, user_type)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      user_fullname,
      user_name,
      password,
      user_type
    ]);

    res.json({
      success: true,
      id: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ONE USER
router.get('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      "SELECT * FROM users WHERE user_id = ?",
      [req.params.id]
    );

    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE USER
router.put('/:id', async (req, res) => {
  try {
    const { user_fullname, user_name, user_type } = req.body;

    await db.query(
      `UPDATE users 
       SET user_fullname=?, user_name=?, user_type=? 
       WHERE user_id=?`,
      [user_fullname, user_name, user_type, req.params.id]
    );

    res.json({ success: true, message: "Updated" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE USER
router.delete('/:id', async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE user_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;