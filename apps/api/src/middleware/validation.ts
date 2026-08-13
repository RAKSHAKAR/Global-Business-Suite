import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/responseHandler";

export interface SchemaRules {
  body?: (data: any) => { valid: boolean; errors?: string[] };
  query?: (data: any) => { valid: boolean; errors?: string[] };
  params?: (data: any) => { valid: boolean; errors?: string[] };
}

export const validateRequest = (rules: SchemaRules) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errorDetails: Record<string, string[]> = {};

    if (rules.params) {
      const result = rules.params(req.params);
      if (!result.valid && result.errors) {
        errorDetails.params = result.errors;
      }
    }

    if (rules.query) {
      const result = rules.query(req.query);
      if (!result.valid && result.errors) {
        errorDetails.query = result.errors;
      }
    }

    if (rules.body) {
      const result = rules.body(req.body);
      if (!result.valid && result.errors) {
        errorDetails.body = result.errors;
      }
    }

    if (Object.keys(errorDetails).length > 0) {
      return sendError(
        res,
        "Validation failed for incoming request.",
        400,
        "VALIDATION_ERROR",
        errorDetails,
      );
    }

    next();
  };
};

/**
 * Common Helper Validation Generators
 */
export const requireFields = (fields: string[]) => {
  return (data: any) => {
    const errors: string[] = [];
    if (!data || typeof data !== "object") {
      return { valid: false, errors: ["Request payload must be an object"] };
    }
    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        errors.push(`Field '${field}' is required.`);
      }
    }
    return { valid: errors.length === 0, errors };
  };
};
