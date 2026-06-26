/**
 * Soft response-shape validation.
 * Wraps res.json so that 2xx payloads are checked against a Zod schema.
 * On mismatch: logs a warning and sends the response unchanged.
 * On match: sends the response unchanged.
 * Never blocks production traffic — schema failures are developer signals only.
 */
export function validateResponse(schema) {
  return (_req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const result = schema.safeParse(body);
        if (!result.success) {
          const issues = result.error.issues
            .slice(0, 5)
            .map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
            .join(' | ');
          console.warn('[res-schema]', issues);
        }
      }
      return originalJson.call(this, body);
    };
    next();
  };
}
