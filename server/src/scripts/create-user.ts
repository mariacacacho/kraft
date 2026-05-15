import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import bcrypt from 'bcryptjs';
import { query } from '../db';
import pool from '../db';

async function main() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Usage: npm run user:create -- "Full Name" email@example.com password');
    process.exit(1);
  }

  const emailLower = email.toLowerCase();

  const existing = await query('SELECT id FROM users WHERE email = $1', [emailLower]);
  if (existing.rows.length > 0) {
    console.error(`✗ A user with email "${emailLower}" already exists`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('✗ Password must be at least 8 characters');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, emailLower, passwordHash]
  );

  const user = result.rows[0];
  console.log('\n✓ User created successfully');
  console.log(`  Name:  ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  ID:    ${user.id}\n`);

  await pool.end();
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
