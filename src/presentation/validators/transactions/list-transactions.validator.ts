import {
	SortDirection,
	TransactionPaymentMethod,
	TransactionQueryStatus,
	TransactionSortField,
} from '@domain/enums/transaction.enums.ts';
import { MESSAGES } from '@shared/constants/message.constants.ts';
import { z } from 'zod';

const emptyStringToUndefined = (val: unknown): unknown =>
	typeof val === 'string' && val.trim() === '' ? undefined : val;

const isValidCalendarDate = (dateStr: string): boolean => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
	const [year, month, day] = dateStr.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
};

export const listTransactionsQuerySchema = z
	.object({
		page: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(1).default(1)),
		limit: z.preprocess(
			emptyStringToUndefined,
			z.coerce.number().int().min(1).max(100).default(20),
		),
		search: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
		status: z.preprocess(
			emptyStringToUndefined,
			z
				.enum([
					TransactionQueryStatus.ALL,
					TransactionQueryStatus.SUCCESS,
					TransactionQueryStatus.PENDING,
					TransactionQueryStatus.FAILED,
					TransactionQueryStatus.REFUNDED,
				])
				.default(TransactionQueryStatus.ALL),
		),
		method: z.preprocess(
			emptyStringToUndefined,
			z
				.enum([
					TransactionPaymentMethod.ALL,
					TransactionPaymentMethod.UPI,
					TransactionPaymentMethod.CARD,
					TransactionPaymentMethod.NETBANKING,
				])
				.default(TransactionPaymentMethod.ALL),
		),
		startDate: z.preprocess(
			emptyStringToUndefined,
			z.string().refine(isValidCalendarDate, { message: MESSAGES.INVALID_DATE_FORMAT }).optional(),
		),
		endDate: z.preprocess(
			emptyStringToUndefined,
			z.string().refine(isValidCalendarDate, { message: MESSAGES.INVALID_DATE_FORMAT }).optional(),
		),
		minAmount: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).optional()),
		maxAmount: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).optional()),
		sortBy: z.preprocess(
			emptyStringToUndefined,
			z
				.enum([TransactionSortField.CREATED_AT, TransactionSortField.AMOUNT_PAISE])
				.default(TransactionSortField.CREATED_AT),
		),
		sortOrder: z.preprocess(
			emptyStringToUndefined,
			z.enum([SortDirection.ASC, SortDirection.DESC]).default(SortDirection.DESC),
		),
	})
	.strict()
	.refine(
		(data) => {
			if (data.startDate && data.endDate) {
				return new Date(data.startDate) <= new Date(data.endDate);
			}
			return true;
		},
		{
			message: MESSAGES.INVALID_DATE_RANGE,
			path: ['startDate'],
		},
	)
	.refine(
		(data) => {
			if (data.minAmount !== undefined && data.maxAmount !== undefined) {
				return data.minAmount <= data.maxAmount;
			}
			return true;
		},
		{
			message: MESSAGES.INVALID_AMOUNT_RANGE,
			path: ['minAmount'],
		},
	);

export type ListTransactionsQueryInput = z.infer<typeof listTransactionsQuerySchema>;
