import { z } from 'zod';

export const linkBankAccountBodySchema = z.object({
	accountHolderName: z.string().trim().min(2).max(100),
	accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must contain 9 to 18 digits'),
	ifsc: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
});

export type LinkBankAccountBody = z.infer<typeof linkBankAccountBodySchema>;
