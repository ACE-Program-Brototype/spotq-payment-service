export interface ApiResponse<T = unknown> {
	success: boolean;
	message: string;
	data?: T;
	error?: string;
	details?: unknown;
	timestamp: string;
}

export const ApiResponse = {
	success<T>(message: string, data?: T): SuccessResponse<T> {
		return new SuccessResponse(message, data);
	},
	error(
		message: string,
		error = 'INTERNAL_SERVER_ERROR',
		_statusCode?: number,
		details?: unknown,
	): ErrorResponse {
		return new ErrorResponse(error, message, details);
	},
};

export class SuccessResponse<T> {
	public readonly success = true;
	public readonly timestamp: string;

	constructor(
		public readonly message: string,
		public readonly data?: T,
	) {
		this.timestamp = new Date().toISOString();
	}
}

export class ErrorResponse {
	public readonly success = false;
	public readonly timestamp: string;

	constructor(
		public readonly error: string,
		public readonly message: string,
		public readonly details?: unknown,
	) {
		this.timestamp = new Date().toISOString();
	}
}
