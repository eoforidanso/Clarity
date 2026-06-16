import { z } from 'zod';

/**
 * Express middleware factory for Zod request body validation.
 * Replaces req.body with the parsed (coerced + stripped) data on success.
 * Returns 400 with a list of field errors on failure.
 *
 * Usage: router.post('/', validate(MySchema), handler)
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map(e => ({
        field: e.path.join('.') || 'body',
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}
