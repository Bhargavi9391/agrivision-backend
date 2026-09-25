import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkHistory() {
  if (fs.existsSync('output.json')) {
    fs.unlinkSync('output.json');
  }
  const res = await pool.query('SELECT * FROM prediction_history ORDER BY created_at DESC LIMIT 10');
  fs.writeFileSync('output.json', JSON.stringify(res.rows, null, 2), 'utf8');
  await pool.end();
}

checkHistory();
