import express from 'express';
import auth from '../middleware/auth.middleware.js';
import role from '../middleware/role.middleware.js';
import { createRecord, getRecords, updateRecord, deleteRecord } from '../controllers/record.controller.js';

const router= express.Router();

router.post('/',auth,role('admin','analyst'), createRecord);
router.get('/',auth, getRecords);
router.put('/:id',auth,role('admin'), updateRecord);
router.delete('/:id',auth,role('admin'), deleteRecord);

export default router;