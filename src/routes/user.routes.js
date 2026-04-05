import express from 'express';
import auth from '../middleware/auth.middleware.js';
import role from '../middleware/role.middleware.js';
import { getUsers, updateUser, deleteUser } from '../controllers/user.controller.js';
import { updateUserValidator, deleteUserValidator } from '../validators/user.validator.js';
import validate from '../middleware/validate.middleware.js';

const router= express.Router();

router.get('/',auth,role('admin'), getUsers);
router.put('/:id',auth,role('admin'), updateUserValidator, validate, updateUser);
router.delete('/:id',auth,role('admin'), deleteUserValidator, validate, deleteUser);

export default router;