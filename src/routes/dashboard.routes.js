import express from 'express';
import auth from '../middleware/auth.middleware.js';
import { summary, trends } from '../controllers/dashboard.controller.js';

const router= express.Router();

router.get('/summary',auth, summary);
router.get('/trends',auth, trends);

export default router;