// Middleware autentikasi JWT & otorisasi berbasis role.
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'ganti-secret-ini-di-produksi';

// Verifikasi token & tempelkan data user ke req.user
export function autentikasi(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ pesan: 'Token tidak ada, silakan login.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ pesan: 'Token tidak valid atau kadaluarsa.' });
  }
}

// Hanya izinkan role tertentu (mis. hanyaAdmin)
export function izinkan(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ pesan: 'Akses ditolak untuk role Anda.' });
    }
    next();
  };
}
