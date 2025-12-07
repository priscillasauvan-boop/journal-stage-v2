import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS stages (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
        name VARCHAR(255) NOT NULL,
        modality VARCHAR(50) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        lieu VARCHAR(255) NOT NULL,
        tuteur VARCHAR(255),
        cadre VARCHAR(255),
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        jours_travailles INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        stage_id INTEGER REFERENCES stages(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
        date DATE NOT NULL,
        mood VARCHAR(50) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stage_id, date)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        stage_id INTEGER REFERENCES stages(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
        date DATE NOT NULL,
        ponctualite INTEGER NOT NULL CHECK (ponctualite BETWEEN 1 AND 4),
        communication INTEGER NOT NULL CHECK (communication BETWEEN 1 AND 4),
        esprit INTEGER NOT NULL CHECK (esprit BETWEEN 1 AND 4),
        confiance INTEGER NOT NULL CHECK (confiance BETWEEN 1 AND 4),
        adaptabilite INTEGER NOT NULL CHECK (adaptabilite BETWEEN 1 AND 4),
        protocoles INTEGER NOT NULL CHECK (protocoles BETWEEN 1 AND 4),
        gestes INTEGER NOT NULL CHECK (gestes BETWEEN 1 AND 4),
        materiel INTEGER NOT NULL CHECK (materiel BETWEEN 1 AND 4),
        organisation INTEGER NOT NULL CHECK (organisation BETWEEN 1 AND 4),
        patient INTEGER NOT NULL CHECK (patient BETWEEN 1 AND 4),
        total_score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS note TEXT;`);
    await client.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) NOT NULL DEFAULT 'default_user';`);
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS esprit INTEGER CHECK (esprit BETWEEN 1 AND 4);`);
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS confiance INTEGER CHECK (confiance BETWEEN 1 AND 4);`);
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS adaptabilite INTEGER CHECK (adaptabilite BETWEEN 1 AND 4);`);
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS protocoles INTEGER CHECK (protocoles BETWEEN 1 AND 4);`);
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS gestes INTEGER CHECK (gestes BETWEEN 1 AND 4);`);
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS materiel INTEGER CHECK (materiel BETWEEN 1 AND 4);`);
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS patient INTEGER CHECK (patient BETWEEN 1 AND 4);`);

    console.log('✅ Tables de base de données initialisées !');
  } catch (error) {
    console.error('❌ Erreur initialisation DB:', error);
  } finally {
    client.release();
  }
}

export { pool, initDatabase };
