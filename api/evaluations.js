import { pool } from '../db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM evaluations ORDER BY date DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur GET evaluations:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { stage_id, date, ponctualite, communication, esprit, confiance, adaptabilite, protocoles, gestes, materiel, organisation, patient, total_score } = req.body;
      const result = await pool.query(
        `INSERT INTO evaluations (stage_id, date, ponctualite, communication, esprit, confiance, adaptabilite, protocoles, gestes, materiel, organisation, patient, total_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [stage_id, date, ponctualite, communication, esprit, confiance, adaptabilite, protocoles, gestes, materiel, organisation, patient, total_score]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur POST evaluation:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
