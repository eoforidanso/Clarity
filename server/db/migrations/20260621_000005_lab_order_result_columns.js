export async function up(db) {
  // Add lab result tracking columns to existing orders table
  const cols = await db.prepare(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders' AND table_schema = 'public'
  `).all();
  const existing = new Set(cols.map(c => c.column_name));

  if (!existing.has('cpt_code'))     await db.prepare(`ALTER TABLE orders ADD COLUMN cpt_code TEXT NOT NULL DEFAULT ''`).run();
  if (!existing.has('result_date'))  await db.prepare(`ALTER TABLE orders ADD COLUMN result_date TEXT`).run();
  if (!existing.has('result_value')) await db.prepare(`ALTER TABLE orders ADD COLUMN result_value TEXT`).run();
  if (!existing.has('ref_range'))    await db.prepare(`ALTER TABLE orders ADD COLUMN ref_range TEXT`).run();
  if (!existing.has('result_flag'))  await db.prepare(`ALTER TABLE orders ADD COLUMN result_flag TEXT`).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE orders DROP COLUMN IF EXISTS cpt_code`).run();
  await db.prepare(`ALTER TABLE orders DROP COLUMN IF EXISTS result_date`).run();
  await db.prepare(`ALTER TABLE orders DROP COLUMN IF EXISTS result_value`).run();
  await db.prepare(`ALTER TABLE orders DROP COLUMN IF EXISTS ref_range`).run();
  await db.prepare(`ALTER TABLE orders DROP COLUMN IF EXISTS result_flag`).run();
}
