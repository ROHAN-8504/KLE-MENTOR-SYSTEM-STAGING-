import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from './errorHandler';

/**
 * Sanitize string to prevent NoSQL injection via regex
 */
export const sanitizeRegex = (str: string): string => {
  // Escape special regex characters
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize object recursively to prevent NoSQL injection
 */
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeRegex(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      // Block MongoDB operators
      if (key.startsWith('$')) {
        continue; // Skip MongoDB operators from user input
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
};

/**
 * Middleware to validate MongoDB ObjectId in params
 */
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next();
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
      });
    }
    
    next();
  };
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    // Remove any keys starting with $ (MongoDB operators)
    const sanitized: any = {};
    for (const key of Object.keys(req.body)) {
      if (!key.startsWith('$')) {
        sanitized[key] = req.body[key];
      }
    }
    req.body = sanitized;
  }
  next();
};

/**
 * Middleware to sanitize query params
 */
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        // Don't sanitize regex for search - we'll handle that in controllers
        // But do prevent MongoDB operators
        if ((req.query[key] as string).includes('$')) {
          req.query[key] = (req.query[key] as string).replace(/\$/g, '');
        }
      }
    }
  }
  next();
};

/**
 * HTML escape for preventing XSS in emails
 */
export const escapeHtml = (str: string): string => {
  const htmlEntities: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Trim and limit string length
 */
export const sanitizeString = (str: string, maxLength: number = 1000): string => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
};
