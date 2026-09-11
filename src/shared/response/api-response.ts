import type { Response } from 'express';
import { HTTP_STATUS, type HttpStatus } from '../constants/http.constants.ts';
import { ErrorResponse, SuccessResponse } from '../utils/response.ts';

export function sendSuccessResponse<T>(
	res: Response,
	data: T,
	message: string,
	statusCode: HttpStatus = HTTP_STATUS.OK,
): void {
	res.status(statusCode).json(new SuccessResponse(message, data));
}

export function sendErrorResponse(
	res: Response,
	message: string,
	error: string,
	statusCode: HttpStatus = HTTP_STATUS.BAD_REQUEST,
	details?: unknown,
): void {
	res.status(statusCode).json(new ErrorResponse(error, message, details));
}
