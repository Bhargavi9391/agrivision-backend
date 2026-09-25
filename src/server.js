import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import predictRoutes from './routes/predictRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { initDb } from './config/initDb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsRoot, { recursive: true });

app.use(cors());
app.use(express.json());

// Static serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

