import { pool } from '../../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name, modality, emoji, lieu, tuteur, cadre, date_debut, date_fin, jours_travailles } = req.body;
      const result = await pool.query(
        `UPDATE stages SET name=$1, modality=$2, emoji=$3, lieu=$4, tuteur=$5, cadre=$6, date_debut=$7, date_fin=$8, jours_travailles=$9
         WHERE id=$10 RETURNING *`,
        [name, modality, emoji, lieu, tuteur, cadre, date_debut, date_fin, jours_travailles, id]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Erreur PUT stage:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM stages WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur DELETE stage:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
