import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`CREATE TYPE project_role AS ENUM ('owner', 'member')`);

  await client.query(`
    CREATE TABLE project_members (
      project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      role        project_role NOT NULL DEFAULT 'member',
      joined_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (project_id, user_id)
    )
  `);

  // Migrate existing owners into the new table
  await client.query(`
    INSERT INTO project_members (project_id, user_id, role)
    SELECT id, owner_id, 'owner'
    FROM projects
    ON CONFLICT DO NOTHING
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS project_members CASCADE');
  await client.query('DROP TYPE IF EXISTS project_role');
}
