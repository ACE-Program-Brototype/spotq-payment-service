import { z } from 'zod';

const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const dateSchema = z
	.string()
	.regex(YYYY_MM_DD_REGEX, 'Date must use YYYY-MM-DD format')
	.refine((value) => {
		const date = new Date(`${value}T00:00:00.000Z`);
		return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
	}, 'Date must be a valid calendar date');
