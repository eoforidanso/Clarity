export async function up(db) {
  // Add DoseSpot prescription ID to orders so webhook can match without fragile LIKE search
  await db.prepare(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS dosespot_prescription_id TEXT
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_orders_ds_rx_id ON orders(dosespot_prescription_id)
    WHERE dosespot_prescription_id IS NOT NULL
  `).run();

  // Same on epcs_transmissions for EPCS prescriptions sent through DoseSpot
  await db.prepare(`
    ALTER TABLE epcs_transmissions ADD COLUMN IF NOT EXISTS dosespot_prescription_id TEXT
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_epcs_ds_rx_id ON epcs_transmissions(dosespot_prescription_id)
    WHERE dosespot_prescription_id IS NOT NULL
  `).run();
}

export async function down(db) {
  await db.prepare(`ALTER TABLE orders DROP COLUMN IF EXISTS dosespot_prescription_id`).run();
  await db.prepare(`ALTER TABLE epcs_transmissions DROP COLUMN IF EXISTS dosespot_prescription_id`).run();
}
