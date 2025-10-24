import Joi from "joi";

export const registerSchema = Joi.object({
  fullName: Joi.string().min(3).required(),
  emailId: Joi.string().email().required(),
  department: Joi.string().required(), // Allow any ObjectId string
  employeeId: Joi.string().trim().uppercase().required(),
  username: Joi.string().trim().lowercase().min(3).optional(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("superadmin", "admin", "employee").required(),
});

export const loginSchema = Joi.object({
  username: Joi.string().trim().lowercase().required(),
  password: Joi.string().required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const updateSchema = Joi.object({
  fullName: Joi.string().min(3),
  emailId: Joi.string().email(),
  department: Joi.string().valid("Production", "Quality", "HR", "Admin", "Other"),
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/),
  role: Joi.string().valid("superadmin", "admin", "employee"),
}).min(1);
