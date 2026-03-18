export type ApiOperationStatus =
  | 'success'
  | 'partial_success'
  | 'forbidden'
  | 'conflict'
  | 'validation_error'
  | 'error';

export type ApiWarningDetail = {
  invalid_roles?: string[];
  invalid_users?: string[];
  reason?: string;
};

export type ApiOperationResult<T> = {
  status: ApiOperationStatus;
  statusCode: number;
  data?: T;
  message?: string;
  warnings?: ApiWarningDetail[];
};
