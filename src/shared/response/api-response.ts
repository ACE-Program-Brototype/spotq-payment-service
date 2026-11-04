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
	arg1: string,
	arg2: string,
	statusCode: HttpStatus = HTTP_STATUS.BAD_REQUEST,
	details?: unknown,
): void {
	let error: string;
	let message: string;

	if (
		arg1.includes(' ') ||
		(arg2 && !arg2.includes(' ') && arg2 === arg2.toUpperCase() && arg1 !== arg1.toUpperCase())
	) {
		message = arg1;
		error = arg2;
	} else if (
		arg2.includes(' ') ||
		(arg1 && !arg1.includes(' ') && arg1 === arg1.toUpperCase() && arg2 !== arg2.toUpperCase())
	) {
		error = arg1;
		message = arg2;
	} else {
		error = arg1;
		message = arg2;
	}

	res.status(statusCode).json(new ErrorResponse(error, message, details));
}
