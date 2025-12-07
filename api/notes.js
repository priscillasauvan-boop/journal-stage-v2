import { pool } from '../db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM notes ORDER BY date DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur GET notes:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { stage_id, date, mood, note } = req.body;
      const result = await pool.query(
        `INSERT INTO notes (stage_id, date, mood, note)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (stage_id, date) DO UPDATE SET mood=$3, note=$4
         RETURNING *`,
        [stage_id, date, mood, note]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur POST note:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
