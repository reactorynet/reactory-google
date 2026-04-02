/**
 * Map Google API errors to Reactory ApiError instances
 */

/**
 * Map a Google API error to a structured error with appropriate HTTP status code.
 */
export function mapGoogleApiError(error: any): Error {
  if (!error) {
    return new Error('Unknown Google API error');
  }

  const code = error.code || error.status || (error.response && error.response.status);
  const message = error.message || 'Google API error';

  switch (code) {
    case 401:
      return Object.assign(new Error(`Google authentication failed: ${message}`), {
        code: 'GOOGLE_AUTH_ERROR',
        httpStatus: 401,
        triggerRefresh: true,
      });

    case 403:
      return Object.assign(new Error(`Google API access forbidden: ${message}`), {
        code: 'GOOGLE_FORBIDDEN',
        httpStatus: 403,
        triggerRefresh: false,
      });

    case 404:
      return Object.assign(new Error(`Google resource not found: ${message}`), {
        code: 'GOOGLE_NOT_FOUND',
        httpStatus: 404,
        triggerRefresh: false,
      });

    case 429:
      return Object.assign(new Error(`Google API rate limit exceeded: ${message}`), {
        code: 'GOOGLE_RATE_LIMITED',
        httpStatus: 429,
        triggerBackoff: true,
      });

    case 500:
    case 503:
      return Object.assign(new Error(`Google API service unavailable: ${message}`), {
        code: 'GOOGLE_SERVICE_UNAVAILABLE',
        httpStatus: 503,
        triggerRetry: true,
      });

    default:
      return Object.assign(new Error(`Google API error (${code}): ${message}`), {
        code: 'GOOGLE_API_ERROR',
        httpStatus: code || 500,
        originalError: error,
      });
  }
}
