/**
 * ============================================================================
 * UNIFIED JOI VALIDATION MIDDLEWARE  
 * ============================================================================
 * 
 * Unified validation middleware using Joi to replace express-validator.
 * Provides consistent validation across all endpoints with proper error handling.
 * 
 * Features:
 * - Joi-based validation middleware for all endpoints
 * - Consistent error response format
 * - Body, query, and params validation
 * - Authentication validation rules
 * - Business entity validation rules
 * - Comprehensive error messages
 * 
 * Created by: Dependency Resolution Engineer
 * Date: 2025-08-24
 */

import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { UserRole } from "@/models/User";

/**
 * Validation middleware factory
 */
export const validate = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema; 
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Authentication validation schemas
 */
export const authValidation = {
  registration: validate({
    body: Joi.object({
      email: Joi.string()
        .email()
        .max(255)
        .required()
        .messages({
          'string.email': 'Valid email address required',
          'string.max': 'Email must not exceed 255 characters'
        }),
      
      password: Joi.string()
        .min(12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.min': 'Password must be at least 12 characters long',
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }),
      
      confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
          'any.only': 'Password confirmation does not match'
        }),
      
      firstName: Joi.string()
        .min(1)
        .max(100)
        .trim()
        .required()
        .messages({
          'string.min': 'First name is required',
          'string.max': 'First name must not exceed 100 characters'
        }),
      
      lastName: Joi.string()
        .min(1)
        .max(100)
        .trim()
        .required()
        .messages({
          'string.min': 'Last name is required',
          'string.max': 'Last name must not exceed 100 characters'
        }),
      
      phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{0,15}$/)
        .optional()
        .messages({
          'string.pattern.base': 'Invalid phone number format'
        }),
      
      role: Joi.string()
        .valid(...Object.values(UserRole))
        .optional()
        .messages({
          'any.only': 'Invalid user role'
        }),
      
      gdprConsentGiven: Joi.boolean()
        .required()
        .messages({
          'any.required': 'GDPR consent status must be specified'
        })
    })
  }),

  login: validate({
    body: Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Valid email address required'
        }),
      
      password: Joi.string()
        .min(1)
        .required()
        .messages({
          'string.min': 'Password is required'
        }),
      
      mfaToken: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .optional()
        .messages({
          'string.length': 'MFA token must be 6 digits',
          'string.pattern.base': 'MFA token must be numeric'
        }),
      
      rememberMe: Joi.boolean()
        .optional()
        .messages({
          'boolean.base': 'Remember me must be boolean'
        })
    })
  }),

  passwordChange: validate({
    body: Joi.object({
      currentPassword: Joi.string()
        .min(1)
        .required()
        .messages({
          'string.min': 'Current password is required'
        }),
      
      newPassword: Joi.string()
        .min(12)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.min': 'New password must be at least 12 characters long',
          'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }),
      
      confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
          'any.only': 'Password confirmation does not match'
        })
    })
  }),

  mfaToken: validate({
    body: Joi.object({
      token: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
          'string.length': 'Valid 6-digit MFA token required',
          'string.pattern.base': 'MFA token must be numeric'
        })
    })
  }),

  sessionId: validate({
    body: Joi.object({
      sessionId: Joi.string()
        .uuid()
        .optional()
        .messages({
          'string.guid': 'Valid session ID required'
        })
    })
  })
};

/**
 * Common validation schemas
 */
export const commonValidation = {
  uuid: validate({
    params: Joi.object({
      id: Joi.string()
        .uuid()
        .required()
        .messages({
          'string.guid': 'Valid UUID required'
        })
    })
  }),

  pagination: validate({
    query: Joi.object({
      page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .optional(),
      
      limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .optional(),
      
      sort: Joi.string()
        .optional(),
      
      order: Joi.string()
        .valid('ASC', 'DESC', 'asc', 'desc')
        .optional()
    })
  })
};

/**
 * Bin validation schemas  
 */
export const binValidation = {
  create: validate({
    body: Joi.object({
      serialNumber: Joi.string()
        .min(1)
        .max(100)
        .required(),
      
      customerId: Joi.string()
        .uuid()
        .required(),
      
      location: Joi.object({
        latitude: Joi.number()
          .min(-90)
          .max(90)
          .required(),
        longitude: Joi.number()
          .min(-180)
          .max(180)
          .required(),
        address: Joi.string()
          .max(255)
          .optional()
      }).required(),
      
      capacity: Joi.number()
        .positive()
        .required(),
      
      type: Joi.string()
        .max(50)
        .optional()
    })
  }),

  update: validate({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }),
    body: Joi.object({
      serialNumber: Joi.string()
        .min(1)
        .max(100)
        .optional(),
      
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),
        address: Joi.string().max(255).optional()
      }).optional(),
      
      capacity: Joi.number()
        .positive()
        .optional(),
      
      type: Joi.string()
        .max(50)
        .optional(),
      
      status: Joi.string()
        .valid('ACTIVE', 'INACTIVE', 'MAINTENANCE')
        .optional()
    })
  })
};

/**
 * Customer validation schemas
 */
export const customerValidation = {
  create: validate({
    body: Joi.object({
      name: Joi.string()
        .min(1)
        .max(255)
        .required(),
      
      email: Joi.string()
        .email()
        .max(255)
        .required(),
      
      phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{0,15}$/)
        .optional(),
      
      address: Joi.object({
        street: Joi.string().max(255).required(),
        city: Joi.string().max(100).required(),
        state: Joi.string().max(100).required(),
        zipCode: Joi.string().max(20).required(),
        country: Joi.string().max(100).optional()
      }).required(),
      
      organizationId: Joi.string()
        .uuid()
        .required()
    })
  }),

  update: validate({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }),
    body: Joi.object({
      name: Joi.string()
        .min(1)
        .max(255)
        .optional(),
      
      email: Joi.string()
        .email()
        .max(255)
        .optional(),
      
      phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{0,15}$/)
        .optional(),
      
      address: Joi.object({
        street: Joi.string().max(255).optional(),
        city: Joi.string().max(100).optional(),
        state: Joi.string().max(100).optional(),
        zipCode: Joi.string().max(20).optional(),
        country: Joi.string().max(100).optional()
      }).optional()
    })
  })
};