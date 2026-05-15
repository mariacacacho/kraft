import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name          VARCHAR(255) NOT NULL,
      avatar_url    VARCHAR(500),
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE projects (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      color       VARCHAR(7) DEFAULT '#6366f1',
      owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`CREATE TYPE ticket_status   AS ENUM ('todo', 'in_progress', 'in_review', 'done')`);
  await client.query(`CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high')`);
  await client.query(`CREATE TYPE ticket_type     AS ENUM ('cotizacion', 'ajuste')`);

  await client.query(`
    CREATE TABLE tickets (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title       VARCHAR(500) NOT NULL,
      description TEXT,
      status      ticket_status   DEFAULT 'todo',
      priority    ticket_priority DEFAULT 'medium',
      type        ticket_type     DEFAULT 'ajuste',
      project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_by  UUID NOT NULL REFERENCES users(id),
      due_date    DATE,
      tags        TEXT[]  DEFAULT '{}',
      position    INTEGER DEFAULT 0,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE attachments (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      filename      VARCHAR(500) NOT NULL,
      original_name VARCHAR(500) NOT NULL,
      mime_type     VARCHAR(100),
      size          INTEGER,
      url           VARCHAR(1000) NOT NULL,
      uploaded_by   UUID NOT NULL REFERENCES users(id),
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE comments (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      author_id  UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS comments    CASCADE');
  await client.query('DROP TABLE IF EXISTS attachments CASCADE');
  await client.query('DROP TABLE IF EXISTS tickets     CASCADE');
  await client.query('DROP TABLE IF EXISTS projects    CASCADE');
  await client.query('DROP TABLE IF EXISTS users       CASCADE');
  await client.query('DROP TYPE IF EXISTS ticket_type');
  await client.query('DROP TYPE IF EXISTS ticket_priority');
  await client.query('DROP TYPE IF EXISTS ticket_status');
}
