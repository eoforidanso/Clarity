const SEED_RESOURCES = [
  { id: 'ed1', title: 'Understanding Your PHQ-9 Score', category: 'Depression', format: 'PDF', language: 'English', pages: 2, read_time: '3 min', description: 'Patient-friendly explanation of PHQ-9 depression screening scores, what they mean, and when to seek help.', tags: '["screening","PHQ-9","self-help"]' },
  { id: 'ed2', title: 'Coping with Anxiety — Grounding Techniques', category: 'Anxiety', format: 'PDF', language: 'English', pages: 4, read_time: '5 min', description: 'Step-by-step guide to 5-4-3-2-1 grounding, box breathing, progressive muscle relaxation, and cognitive defusion.', tags: '["coping","self-help","CBT"]' },
  { id: 'ed3', title: 'What is EMDR Therapy?', category: 'PTSD', format: 'Infographic', language: 'English', pages: 1, read_time: '2 min', description: 'Visual overview of Eye Movement Desensitization and Reprocessing therapy — what to expect in sessions.', tags: '["therapy","trauma"]' },
  { id: 'ed4', title: 'ADHD Medication Guide for Adults', category: 'ADHD', format: 'PDF', language: 'English', pages: 6, read_time: '8 min', description: 'Comprehensive guide to stimulant and non-stimulant ADHD medications, side effects, and what to report to your provider.', tags: '["medication","stimulants","safety"]' },
  { id: 'ed5', title: 'Naloxone (Narcan) — How to Save a Life', category: 'Substance Use', format: 'Infographic', language: 'English', pages: 1, read_time: '2 min', description: 'Visual guide on recognizing opioid overdose and administering intranasal naloxone.', tags: '["harm reduction","opioids","safety"]' },
  { id: 'ed6', title: 'Entendiendo su Puntaje de PHQ-9', category: 'Depression', format: 'PDF', language: 'Spanish', pages: 2, read_time: '3 min', description: 'Spanish-language version of PHQ-9 score interpretation guide.', tags: '["screening","PHQ-9","Spanish"]' },
  { id: 'ed7', title: 'Sleep Hygiene — 10 Rules for Better Sleep', category: 'Sleep', format: 'PDF', language: 'English', pages: 2, read_time: '4 min', description: 'Evidence-based sleep hygiene practices for patients with insomnia or disrupted sleep patterns.', tags: '["insomnia","self-help","wellness"]' },
  { id: 'ed8', title: 'My Safety Plan Template', category: 'Crisis & Safety', format: 'Worksheet', language: 'English', pages: 1, read_time: '10 min', description: 'Fillable safety plan worksheet based on the Stanley-Brown Safety Planning Intervention.', tags: '["safety plan","suicide prevention","C-SSRS"]' },
  { id: 'ed9', title: 'Bipolar Disorder — Mood Tracking Journal', category: 'Bipolar', format: 'Worksheet', language: 'English', pages: 4, read_time: '5 min', description: 'Daily mood tracking worksheet with sleep, medication adherence, and energy level columns.', tags: '["mood tracking","self-monitoring"]' },
  { id: 'ed10', title: 'CBT Thought Record Worksheet', category: 'Anxiety', format: 'Worksheet', language: 'English', pages: 2, read_time: '10 min', description: 'CBT thought record for identifying automatic thoughts, cognitive distortions, and balanced alternatives.', tags: '["CBT","worksheet","cognitive"]' },
  { id: 'ed11', title: 'Supporting a Loved One with Depression', category: 'Caregiver Support', format: 'PDF', language: 'English', pages: 3, read_time: '5 min', description: 'Guide for family members and caregivers on how to support someone experiencing depression.', tags: '["family","support","caregiver"]' },
  { id: 'ed12', title: 'Mindfulness Meditation — Getting Started', category: 'Wellness', format: 'Video', language: 'English', pages: 0, read_time: '12 min', description: '12-minute guided mindfulness meditation video for beginners. Includes body scan and breathing exercises.', tags: '["mindfulness","meditation","video"]' },
];

export async function up(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS education_resources (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      category     TEXT NOT NULL,
      format       TEXT NOT NULL,
      language     TEXT NOT NULL DEFAULT 'English',
      pages        INTEGER NOT NULL DEFAULT 0,
      read_time    TEXT NOT NULL DEFAULT '',
      description  TEXT NOT NULL DEFAULT '',
      tags         JSONB NOT NULL DEFAULT '[]',
      downloads    INTEGER NOT NULL DEFAULT 0,
      location_id  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_edu_resources_category ON education_resources(category)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_edu_resources_format   ON education_resources(format)`).run();

  for (const r of SEED_RESOURCES) {
    await db.prepare(`
      INSERT INTO education_resources (id, title, category, format, language, pages, read_time, description, tags, downloads)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT (id) DO NOTHING
    `).run(r.id, r.title, r.category, r.format, r.language, r.pages, r.read_time, r.description, r.tags);
  }
}

export async function down(db) {
  await db.prepare(`DROP TABLE IF EXISTS education_resources`).run();
}
