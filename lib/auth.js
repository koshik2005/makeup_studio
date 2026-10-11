import jwt from 'jsonwebtoken';

export function signToken() {
  return jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

export function requireAdmin(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    if (!process.env.JWT_SECRET) throw new Error('no secret');
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    res.status(401).json({ error: 'Please sign in again.' });
    return false;
  }
}
