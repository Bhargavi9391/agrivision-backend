import express from 'express';
import { getAdminOverview } from '../controllers/adminController.js';
import { adminRequired, authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/overview', authRequired, adminRequired, getAdminOverview);

export default router;
