import express from 'express';
import auth from '../middleware/auth.middleware.js';
import role from '../middleware/role.middleware.js';
import { getUsers, updateUser, deleteUser } from '../controllers/user.controller.js';

const router= express.Router();

router.get('/',auth,role('admin'), getUsers);
router.put('/:id',auth,role('admin'), updateUser);
router.delete('/:id',auth,role('admin'), deleteUser);

export default router;