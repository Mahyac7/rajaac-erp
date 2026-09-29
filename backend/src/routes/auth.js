// Route autentikasi: login & info user saat ini.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { autentikasi, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ pesan: 'Username dan password wajib diisi.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND aktif = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ pesan: 'Username atau password salah.' });
  }
  const payload = {
    id: user.id,
    nama: user.nama,
    username: user.username,
    role: user.role,
    cabang_id: user.cabang_id,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: payload });
});

router.get('/saya', autentikasi, (req, res) => {
  res.json({ user: req.user });
});

export default router;
