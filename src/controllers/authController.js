import { createUser, findUserByEmail, verifyPassword } from '../models/User.js';
import { generateToken } from '../middleware/authMiddleware.js';

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const finalRole = role === 'admin' ? 'admin' : 'user';

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await createUser({ name, email, password, role: finalRole });
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { password: _, ...safeUser } = user;
    const token = generateToken(safeUser);
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
}

