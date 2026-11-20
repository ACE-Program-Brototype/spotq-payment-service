export class ApiResponse<T = unknown> {
	public readonly timestamp: string;

	protected constructor(
		public readonly success: boolean,
		public readonly message: string,
		public readonly data?: T,
		public readonly error?: string,
		public readonly details?: unknown,
	) {
		this.timestamp = new Date().toISOString();
	}

	static success<T>(message: string, data?: T): SuccessResponse<T> {
		return new SuccessResponse(message, data);
	}

	static error(error: string, message: string, details?: unknown): ErrorResponse {
		return new ErrorResponse(error, message, details);
	}
}

export class SuccessResponse<T> extends ApiResponse<T> {
	constructor(message: string, data?: T) {
		super(true, message, data);
	}
}

export class ErrorResponse extends ApiResponse<never> {
	constructor(error: string, message: string, details?: unknown) {
		super(false, message, undefined, error, details);
	}
}
