import { body, param, query } from 'express-validator';

export const createRecordValidator = [
  body('userId')
    .notEmpty().withMessage('userId is required')
    .isMongoId().withMessage('Invalid userId format'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isNumeric().withMessage('Amount must be a number'),

  body('type')
    .notEmpty().withMessage('Type is required')
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ max: 100 }).withMessage('Category must be at most 100 characters'),

  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be at most 500 characters'),
];

export const updateRecordValidator = [
  param('id')
    .isMongoId().withMessage('Invalid record ID format'),

  body('amount')
    .optional()
    .isNumeric().withMessage('Amount must be a number'),

  body('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category must be at most 100 characters'),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must be at most 500 characters'),
];

export const deleteRecordValidator = [
  param('id')
    .isMongoId().withMessage('Invalid record ID format'),
];

export const getRecordsValidator = [
  query('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('startDate must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('endDate must be a valid ISO 8601 date'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];
