import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';
import { createPredictionHistory, getPredictionHistoryByUser } from '../models/PredictionHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001/predict';

export async function uploadAndPredict(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const imagePath = `uploads/${req.file.filename}`;
    const formData = new FormData();
    const streamPath = req.file.path; // Use the actual path from Multer
    formData.append('image', fs.createReadStream(streamPath), path.basename(streamPath));

    const response = await axios.post(AI_SERVICE_URL, formData, {
      headers: formData.getHeaders(),
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const { prediction_label, confidence, ndvi, models } = response.data;

    const record = await createPredictionHistory({
      userId: req.user.id,
      imagePath,
      prediction: prediction_label,
      confidence
    });

    res.json({
      prediction: prediction_label,
      confidence,
      ndvi,
      models: models || null,
      historyRecord: record,
      imageUrl: `/${imagePath}`
    });
  } catch (err) {
    console.error('Prediction error:', err.response?.data || err.message);

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        message: 'AI Analysis Service is currently offline. Please ensure the AI service is running on port 5001.',
        error: 'SERVICE_OFFLINE'
      });
    }

    if (err.response) {
      // The AI service returned an error response (e.g. 400, 500, 503)
      return res.status(err.response.status).json({
        message: err.response.data?.message || 'AI Service encountered an error',
        details: err.response.data,
        error: 'AI_SERVICE_ERROR'
      });
    }

    next(err);
  }
}

export async function getHistory(req, res, next) {
  try {
    const records = await getPredictionHistoryByUser(req.user.id);
    const mapped = records.map((r) => ({
      ...r,
      image_url: `/${r.image_path}`
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

