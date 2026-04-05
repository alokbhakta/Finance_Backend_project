import { body, param } from 'express-validator';

export const updateUserValidator = [
  param('id')
    .isMongoId().withMessage('Invalid user ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['viewer', 'admin', 'analyst']).withMessage('Role must be viewer, admin, or analyst'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
];

export const deleteUserValidator = [
  param('id')
    .isMongoId().withMessage('Invalid user ID format'),
];
