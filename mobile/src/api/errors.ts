export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
    readonly isRetryable = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  userMessage(_t: (key: string) => string): string {
    if (this.status === 409) return _t('errors.conflict');
    if (this.status === 401) return _t('errors.unauthorized');
    if (this.status >= 500) return _t('errors.server');
    return this.message || _t('errors.generic');
  }
}

export function fromAxiosError(err: any): ApiError {
  if (!err || !err.isAxiosError) {
    return new ApiError(String(err ?? 'Unknown'), 0, undefined, err);
  }
  const status = err.response?.status ?? 0;
  const data = err.response?.data;
  const message = data?.message ?? err.message ?? 'Request failed';
  const code = data?.code;
  return new ApiError(message, status, code, data);
}
