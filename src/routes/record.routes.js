import express from 'express';
import auth from '../middleware/auth.middleware.js';
import role from '../middleware/role.middleware.js';
import { createRecord, getRecords, updateRecord, deleteRecord } from '../controllers/record.controller.js';
import { createRecordValidator, updateRecordValidator, deleteRecordValidator } from '../validators/record.validator.js';
import validate from '../middleware/validate.middleware.js';

const router= express.Router();

router.post('/',auth,role('admin','analyst'), createRecordValidator, validate, createRecord);
router.get('/',auth, getRecords);
router.put('/:id',auth,role('admin'), updateRecordValidator, validate, updateRecord);
router.delete('/:id',auth,role('admin'), deleteRecordValidator, validate, deleteRecord);

export default router;