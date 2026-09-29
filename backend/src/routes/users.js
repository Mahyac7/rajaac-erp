// Route manajemen user (hanya admin).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi, izinkan('admin'));

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.nama, u.username, u.role, u.cabang_id, u.aktif, c.nama AS cabang_nama
       FROM users u LEFT JOIN cabang c ON c.id = u.cabang_id
       ORDER BY u.id`
    )
    .all();
  res.json(rows);
});

router.post('/', (req, res) => {
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
  const ada = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (ada) return res.status(409).json({ pesan: 'Username sudah dipakai.' });
  const info = db
    .prepare('INSERT INTO users (nama, username, password, role, cabang_id) VALUES (?,?,?,?,?)')
    .run(nama, username, bcrypt.hashSync(password, 10), role, role === 'admin' ? null : cabang_id);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { nama, role, cabang_id, aktif, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ pesan: 'User tidak ditemukan.' });
  db.prepare(
    'UPDATE users SET nama = ?, role = ?, cabang_id = ?, aktif = ? WHERE id = ?'
  ).run(
    nama ?? user.nama,
    role ?? user.role,
    (role ?? user.role) === 'admin' ? null : (cabang_id ?? user.cabang_id),
    aktif === undefined ? user.aktif : (aktif ? 1 : 0),
    req.params.id
  );
  if (password) {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
      bcrypt.hashSync(password, 10), req.params.id
    );
  }
  res.json({ pesan: 'User diperbarui.' });
});

export default router;
