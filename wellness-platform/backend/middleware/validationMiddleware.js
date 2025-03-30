const { body, param } = require('express-validator');

// User Validators
exports.registerValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim(),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
];

exports.loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

exports.updateUserValidator = [
  body('firstName')
    .optional()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .trim(),
  body('lastName')
    .optional()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .trim()
];

exports.resetPasswordValidator = [
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter')
];

// Health Profile Validators
exports.createHealthProfileValidator = [
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .toDate(),
  body('gender')
    .isIn(['male', 'female', 'non-binary', 'prefer-not-to-say'])
    .withMessage('Gender must be one of: male, female, non-binary, prefer-not-to-say')
];

exports.physicalMetricsValidator = [
  body('height.value')
    .optional()
    .isNumeric()
    .withMessage('Height value must be a number'),
  body('height.unit')
    .optional()
    .isIn(['cm', 'in'])
    .withMessage('Height unit must be either cm or in'),
  body('weight.value')
    .optional()
    .isNumeric()
    .withMessage('Weight value must be a number'),
  body('weight.unit')
    .optional()
    .isIn(['kg', 'lb'])
    .withMessage('Weight unit must be either kg or lb'),
  body('bodyFatPercentage')
    .optional()
    .isNumeric()
    .withMessage('Body fat percentage must be a number')
    .custom(value => value >= 0 && value <= 100)
    .withMessage('Body fat percentage must be between 0 and 100'),
  body('waistCircumference.value')
    .optional()
    .isNumeric()
    .withMessage('Waist circumference value must be a number'),
  body('waistCircumference.unit')
    .optional()
    .isIn(['cm', 'in'])
    .withMessage('Waist circumference unit must be either cm or in')
];

exports.fitnessGoalValidator = [
  body('type')
    .isIn(['weight', 'strength', 'endurance', 'flexibility', 'overall-health'])
    .withMessage('Type must be one of: weight, strength, endurance, flexibility, overall-health'),
  body('target.value')
    .optional()
    .isNumeric()
    .withMessage('Target value must be a number'),
  body('target.unit')
    .optional()
    .notEmpty()
    .withMessage('Target unit is required when target value is provided'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date')
    .toDate(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be a number between 0 and 100')
];

exports.updateGoalProgressValidator = [
  body('progress')
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be a number between 0 and 100')
];

exports.validateObjectId = (paramName) => {
  return param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`);
};