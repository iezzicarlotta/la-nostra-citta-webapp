import { HttpError } from '../utils/http-error.js';

export function validate(schema, source = 'body') {
  return (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      return next(new HttpError(400, 'Dati non validi.', 'VALIDATION_ERROR', result.error.flatten()));
    }

    try {
      Object.defineProperty(request, source, {
        value: result.data,
        configurable: true,
        enumerable: true,
        writable: true
      });
    } catch {
      request[source] = result.data;
    }

    next();
  };
}
