import express from 'express';
import auth from '../middleware/auth.middleware.js';
import { summary } from '../controllers/dashboard.controller.js';

const router= express.Router();

router.get('/summary',auth, summary);

export default router;