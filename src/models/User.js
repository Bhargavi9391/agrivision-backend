import { query } from '../config/db.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function createUser({ name, email, password, role = 'user' }) {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
    [name, email, hashed, role]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, name, email, password, role, created_at FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

export async function getUserCountsByRole() {
  const result = await query(
    `SELECT role, COUNT(*)::int AS count
     FROM users
     GROUP BY role`
  );
  return result.rows;
}

export async function getRecentUsers(limit = 5) {
  const result = await query(
    `SELECT id, name, email, role, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

