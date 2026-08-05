const mysql = require('mysql2/promise');
require('dotenv').config();

const parsedPort = parseInt(process.env.DB_PORT, 10);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'lgu_gym_reservation_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log(`✅ Database connected to ${process.env.DB_NAME}`);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

module.exports = pool;