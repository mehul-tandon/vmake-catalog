import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Validation schemas
export const schemas = {
  register: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    whatsappNumber: Joi.string().pattern(/^\+91[6-9]\d{9}$/).required()
  }),

  adminLogin: Joi.object({
    whatsappNumber: Joi.string().pattern(/^\+91[6-9]\d{9}$/).required(),
    password: Joi.string().min(6).max(128).required()
  }),

  product: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    code: Joi.string().trim().min(1).max(50).required(),
    category: Joi.string().trim().min(1).max(100).required(),
    length: Joi.number().positive().max(10000).required(),
    breadth: Joi.number().positive().max(10000).required(),
    height: Joi.number().positive().max(10000).required(),
    finish: Joi.string().trim().min(1).max(100).required(),
    material: Joi.string().trim().max(100).optional().allow(''),
    imageUrl: Joi.string().uri().optional().allow('', null)
  }),

  updateProduct: Joi.object({
    name: Joi.string().trim().min(1).max(200).optional(),
    code: Joi.string().trim().min(1).max(50).optional(),
    category: Joi.string().trim().min(1).max(100).optional(),
    length: Joi.number().positive().max(10000).optional(),
    breadth: Joi.number().positive().max(10000).optional(),
    height: Joi.number().positive().max(10000).optional(),
    finish: Joi.string().trim().min(1).max(100).optional(),
    material: Joi.string().trim().max(100).optional().allow(''),
    imageUrl: Joi.string().uri().optional().allow('', null)
  }),

  createUser: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    whatsappNumber: Joi.string().pattern(/^\+91[6-9]\d{9}$/).required(),
    password: Joi.string().min(6).max(128).optional(),
    isAdmin: Joi.boolean().optional()
  }),

  updateUser: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    whatsappNumber: Joi.string().pattern(/^\+91[6-9]\d{9}$/).optional(),
    password: Joi.string().min(6).max(128).optional(),
    isAdmin: Joi.boolean().optional(),
    isPrimaryAdmin: Joi.boolean().optional()
  }),

  wishlist: Joi.object({
    productId: Joi.number().integer().min(1).required()
  })
};

// Validation middleware factory
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      return res.status(400).json({
        message: 'Validation error',
        details: errorMessage
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}

// Parameter validation middleware
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      return res.status(400).json({
        message: 'Parameter validation error',
        details: errorMessage
      });
    }

    req.params = value;
    next();
  };
}

// Query validation middleware
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');

      return res.status(400).json({
        message: 'Query validation error',
        details: errorMessage
      });
    }

    req.query = value;
    next();
  };
}

// Common parameter schemas
export const paramSchemas = {
  id: Joi.object({
    id: Joi.number().integer().min(1).required()
  }),

  userId: Joi.object({
    userId: Joi.number().integer().min(1).required()
  }),

  productId: Joi.object({
    productId: Joi.number().integer().min(1).required()
  })
};

// Common query schemas
export const querySchemas = {
  products: Joi.object({
    search: Joi.string().trim().max(200).optional(),
    category: Joi.string().trim().max(100).optional(),
    finish: Joi.string().trim().max(100).optional(),
    material: Joi.string().trim().max(100).optional(),
    sortBy: Joi.string().valid('name', 'code', 'category', 'newest').optional()
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};
