const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        details: error.details
      });
    }
    
    next();
  };
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    department: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid('user', 'manager', 'admin').default('user')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    department: Joi.string().min(2).max(100),
    avatar: Joi.string().uri().allow(null)
  }).min(1)
};

// Service validation schemas
const serviceSchemas = {
  create: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(10).max(500).required(),
    category: Joi.string().min(2).max(50).required(),
    icon: Joi.string().max(50).default('bi-gear'),
    formFields: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        label: Joi.string().required(),
        type: Joi.string().valid('text', 'email', 'number', 'select', 'textarea', 'checkbox', 'radio', 'date').required(),
        required: Joi.boolean().default(false),
        options: Joi.array().items(Joi.string()).when('type', {
          is: Joi.string().valid('select', 'radio'),
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        placeholder: Joi.string().allow(''),
        validation: Joi.object({
          min: Joi.number(),
          max: Joi.number(),
          pattern: Joi.string()
        }).optional()
      })
    ).default([]),
    approvalRequired: Joi.boolean().default(true),
    estimatedTime: Joi.string().max(100).default('1-3 business days'),
    isActive: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(100),
    description: Joi.string().min(10).max(500),
    category: Joi.string().min(2).max(50),
    icon: Joi.string().max(50),
    formFields: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        label: Joi.string().required(),
        type: Joi.string().valid('text', 'email', 'number', 'select', 'textarea', 'checkbox', 'radio', 'date').required(),
        required: Joi.boolean().default(false),
        options: Joi.array().items(Joi.string()).when('type', {
          is: Joi.string().valid('select', 'radio'),
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        placeholder: Joi.string().allow(''),
        validation: Joi.object({
          min: Joi.number(),
          max: Joi.number(),
          pattern: Joi.string()
        }).optional()
      })
    ),
    approvalRequired: Joi.boolean(),
    estimatedTime: Joi.string().max(100),
    isActive: Joi.boolean()
  }).min(1)
};

// Service request validation schemas
const requestSchemas = {
  create: Joi.object({
    serviceId: Joi.string().required(),
    serviceName: Joi.string().required(),
    description: Joi.string().max(1000).allow(''),
    formData: Joi.object().default({}),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium')
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected', 'in-progress', 'completed').required()
  }),

  addComment: Joi.object({
    comment: Joi.string().min(1).max(1000).required()
  })
};

module.exports = {
  validate,
  userSchemas,
  serviceSchemas,
  requestSchemas
};