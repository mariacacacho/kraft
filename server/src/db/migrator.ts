import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';

interface MigrationModule {
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
}

export class Migrator {
  private readonly migrationsDir: string;

  constructor(private readonly pool: Pool, migrationsDir?: string) {
    this.migrationsDir = migrationsDir ?? path.join(__dirname, 'migrations');
  }

  private async ensureMigrationsTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          VARCHAR(255) PRIMARY KEY,
        applied_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  }

  private async getApplied(client: PoolClient): Promise<string[]> {
    const result = await client.query<{ id: string }>(
      'SELECT id FROM schema_migrations ORDER BY id ASC'
    );
    return result.rows.map((r) => r.id);
  }

  private loadIds(): string[] {
    if (!fs.existsSync(this.migrationsDir)) return [];

    const seen = new Set<string>();
    for (const file of fs.readdirSync(this.migrationsDir).sort()) {
      const m = file.match(/^(.+)\.(ts|js)$/);
      if (m) seen.add(m[1]);
    }
    return Array.from(seen).sort();
  }

  private load(id: string): MigrationModule {
    const tsPath = path.join(this.migrationsDir, `${id}.ts`);
    const jsPath = path.join(this.migrationsDir, `${id}.js`);

    if (fs.existsSync(tsPath)) return require(tsPath) as MigrationModule;
    if (fs.existsSync(jsPath)) return require(jsPath) as MigrationModule;
    throw new Error(`Migration file not found for id: ${id}`);
  }

  async up(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.ensureMigrationsTable(client);

      const applied = await this.getApplied(client);
      const pending = this.loadIds().filter((id) => !applied.includes(id));

      if (pending.length === 0) {
        console.log('✓ Already up to date — no pending migrations');
        await client.query('COMMIT');
        return;
      }

      for (const id of pending) {
        console.log(`  → Running: ${id}`);
        await this.load(id).up(client);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
        console.log(`  ✓ Applied: ${id}`);
      }

      await client.query('COMMIT');
      console.log(`\n✓ ${pending.length} migration(s) applied`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async down(steps = 1): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.ensureMigrationsTable(client);

      const applied = await this.getApplied(client);
      if (applied.length === 0) {
        console.log('✓ Nothing to roll back');
        await client.query('COMMIT');
        return;
      }

      const toRollback = applied.slice(-steps).reverse();

      for (const id of toRollback) {
        console.log(`  ← Rolling back: ${id}`);
        await this.load(id).down(client);
        await client.query('DELETE FROM schema_migrations WHERE id = $1', [id]);
        console.log(`  ✓ Rolled back: ${id}`);
      }

      await client.query('COMMIT');
      console.log(`\n✓ ${toRollback.length} migration(s) rolled back`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async status(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await this.ensureMigrationsTable(client);
      const applied = new Set(await this.getApplied(client));
      const ids = this.loadIds();

      console.log('\nMigration status:');
      console.log('─'.repeat(55));

      if (ids.length === 0) {
        console.log('  No migration files found in', this.migrationsDir);
      } else {
        for (const id of ids) {
          const mark = applied.has(id) ? '✓' : '○';
          const label = applied.has(id) ? 'applied' : 'pending';
          console.log(`  ${mark}  ${id}  [${label}]`);
        }
      }

      const pending = ids.filter((id) => !applied.has(id));
      console.log('─'.repeat(55));
      console.log(`  ${applied.size} applied, ${pending.length} pending\n`);
    } finally {
      client.release();
    }
  }

  create(name: string): void {
    if (!name) throw new Error('Migration name is required');

    fs.mkdirSync(this.migrationsDir, { recursive: true });

    const existing = this.loadIds();
    const lastNum = existing.reduce((max, id) => {
      const m = id.match(/^(\d+)/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);

    const num = String(lastNum + 1).padStart(3, '0');
    const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const id = `${num}_${slug}`;
    const filePath = path.join(this.migrationsDir, `${id}.ts`);

    const template = `import { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  // TODO: implement migration
}

export async function down(client: PoolClient): Promise<void> {
  // TODO: implement rollback
}
`;

    fs.writeFileSync(filePath, template);
    console.log(`✓ Created migration: ${filePath}`);
  }
}
