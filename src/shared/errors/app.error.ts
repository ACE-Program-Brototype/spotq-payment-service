import { ERROR_CODES, HTTP_STATUS, type HttpStatus, MESSAGES } from '../constants/index.ts';

export class AppError extends Error {
	constructor(
		message: string,
		public readonly statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
		public readonly code: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace?.(this, this.constructor);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message: string = MESSAGES.UNAUTHORIZED_ACCESS, details?: unknown) {
		super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, details);
	}
}

export class ForbiddenError extends AppError {
	constructor(message: string = MESSAGES.FORBIDDEN_ACCESS, details?: unknown) {
		super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, details);
	}
}
