import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import bcrypt from 'bcryptjs';
import { query } from './index';

async function seed() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 10);
  const userResult = await query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['admin@kraft.app', passwordHash, 'Admin User']
  );

  const userId = userResult.rows[0].id;

  const projectResult = await query(
    `INSERT INTO projects (name, description, color, owner_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    ['My First Project', 'Sample project to get started', '#6366f1', userId]
  );

  if (projectResult.rows.length > 0) {
    const projectId = projectResult.rows[0].id;

    const tickets = [
      { title: 'Setup project structure', status: 'done', priority: 'high', type: 'ajuste', tags: ['#setup', '#infra'] },
      { title: 'Design database schema', status: 'in_review', priority: 'high', type: 'ajuste', tags: ['#database'] },
      { title: 'Implement auth flow', status: 'in_progress', priority: 'medium', type: 'ajuste', tags: ['#auth', '#security'] },
      { title: 'Build Kanban board UI', status: 'in_progress', priority: 'medium', type: 'cotizacion', tags: ['#ui', '#frontend'] },
      { title: 'Add file attachments', status: 'todo', priority: 'low', type: 'ajuste', tags: ['#feature'] },
      { title: 'Write unit tests', status: 'todo', priority: 'medium', type: 'ajuste', tags: ['#testing'] },
    ];

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      await query(
        `INSERT INTO tickets (title, status, priority, type, project_id, created_by, tags, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [t.title, t.status, t.priority, t.type, projectId, userId, t.tags, i]
      );
    }
  }

  console.log('Seed completed!');
  console.log('Login: admin@kraft.app / admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
