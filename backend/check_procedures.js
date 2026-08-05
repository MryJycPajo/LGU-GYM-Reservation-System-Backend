const mysql = require('mysql2/promise');

const procedures_called = [
  'sp_insert_user',
  'sp_get_all_users',
  'sp_select_user',
  'sp_select_user_by_email',
  'sp_update_user',
  'sp_delete_user',
  'sp_get_all_translations',
  'sp_select_translation',
  'sp_insert_translation',
  'sp_update_translation',
  'sp_delete_translation',
  'sp_get_all_symbol_images',
  'sp_select_symbol_image',
  'sp_insert_symbol_image',
  'sp_update_symbol_image',
  'sp_delete_symbol_image',
  'sp_count_successful_matches',
  'sp_get_all_search_logs',
  'sp_get_search_logs_by_user',
  'sp_get_all_activity_logs',
  'sp_select_activity_log',
  'sp_insert_activity_log',
  'sp_delete_activity_log',
  'sp_insert_search_log',
  'sp_select_search_log',
  'sp_delete_search_log',
  'sp_delete_old_logs',
  'sp_get_all_chat_messages',
  'sp_select_chat_message',
  'sp_insert_chat_message',
  'sp_update_chat_message',
  'sp_delete_chat_message',
  'sp_get_all_saved_words',
  'sp_select_saved_word',
  'sp_insert_saved_word',
  'sp_update_saved_word',
  'sp_delete_saved_word'
];

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT || 3306)
    });

    console.log('✓ Connected to database\n');

    const [databases] = await connection.query('SHOW DATABASES');
    console.log('Available databases:');
    databases.forEach(db => console.log(`  - ${db.Database}`));
    console.log('');

    const dbName = process.env.DB_NAME || 'bisublar_esk';
    console.log(`Target database: ${dbName}\n`);

    const [procedures] = await connection.query(
      `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES 
       WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
       ORDER BY ROUTINE_NAME`,
      [dbName]
    );

    const existing = new Set(procedures.map(p => p.ROUTINE_NAME));
    console.log(`Found ${existing.size} stored procedures in database:\n`);

    const missing = [];
    const found = [];

    procedures_called.forEach(sp => {
      if (existing.has(sp)) {
        found.push(sp);
        console.log(`✓ ${sp}`);
      } else {
        missing.push(sp);
        console.log(`✗ ${sp} (MISSING)`);
      }
    });

    console.log(`\n========================================`);
    console.log(`Found: ${found.length}/${procedures_called.length}`);
    console.log(`Missing: ${missing.length}`);
    if (missing.length > 0) {
      console.log(`\nMissing procedures:\n${missing.map(m => `  - ${m}`).join('\n')}`);
    }

    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
