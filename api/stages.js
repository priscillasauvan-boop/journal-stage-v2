import { pool } from '../db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM stages ORDER BY date_debut DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur GET stages:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, modality, emoji, lieu, tuteur, cadre, date_debut, date_fin, jours_travailles } = req.body;
      const result = await pool.query(
        `INSERT INTO stages (name, modality, emoji, lieu, tuteur, cadre, date_debut, date_fin, jours_travailles)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [name, modality, emoji, lieu, tuteur, cadre, date_debut, date_fin, jours_travailles]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur POST stage:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
