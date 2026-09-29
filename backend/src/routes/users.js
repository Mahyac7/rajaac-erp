// Route manajemen user (hanya admin).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { satu, semua, query } from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi, izinkan('admin'));

router.get('/', async (req, res, next) => {
  try {
    const rows = await semua(
      `SELECT u.id, u.nama, u.username, u.role, u.cabang_id, u.aktif, c.nama AS cabang_nama
       FROM users u LEFT JOIN cabang c ON c.id = u.cabang_id
       ORDER BY u.id`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nama, username, password, role, cabang_id } = req.body || {};
    if (!nama || !username || !password || !role) {
      return res.status(400).json({ pesan: 'Nama, username, password, dan role wajib diisi.' });
    }
    if (!['admin', 'kasir'].includes(role)) {
      return res.status(400).json({ pesan: 'Role harus admin atau kasir.' });
    }
    if (role === 'kasir' && !cabang_id) {
      return res.status(400).json({ pesan: 'Kasir harus memiliki cabang.' });
    }
    const ada = await satu('SELECT id FROM users WHERE username = $1', [username]);
    if (ada) return res.status(409).json({ pesan: 'Username sudah dipakai.' });
    const row = await satu(
      'INSERT INTO users (nama, username, password, role, cabang_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nama, username, bcrypt.hashSync(password, 10), role, role === 'admin' ? null : cabang_id]
    );
    res.status(201).json({ id: row.id });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nama, role, cabang_id, aktif, password } = req.body || {};
    const user = await satu('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ pesan: 'User tidak ditemukan.' });
    const roleBaru = role ?? user.role;
    await query(
      'UPDATE users SET nama = $1, role = $2, cabang_id = $3, aktif = $4 WHERE id = $5',
      [
        nama ?? user.nama,
        roleBaru,
        roleBaru === 'admin' ? null : (cabang_id ?? user.cabang_id),
        aktif === undefined ? user.aktif : !!aktif,
        req.params.id,
      ]
    );
    if (password) {
      await query('UPDATE users SET password = $1 WHERE id = $2', [bcrypt.hashSync(password, 10), req.params.id]);
    }
    res.json({ pesan: 'User diperbarui.' });
  } catch (e) { next(e); }
});

export default router;
