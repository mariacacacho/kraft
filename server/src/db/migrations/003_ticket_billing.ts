import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  await client.query(`CREATE TYPE payment_status AS ENUM ('pending', 'paid')`);

  await client.query(`
    ALTER TABLE tickets
      ADD COLUMN estimated_hours NUMERIC(6, 2),
      ADD COLUMN payment_status  payment_status NOT NULL DEFAULT 'pending'
  `);
}

export async function down(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE tickets
      DROP COLUMN IF EXISTS estimated_hours,
      DROP COLUMN IF EXISTS payment_status
  `);
  await client.query(`DROP TYPE IF EXISTS payment_status`);
}
