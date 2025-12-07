import { pool } from '../../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM notes WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur DELETE note:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
