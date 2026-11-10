import { MESSAGES } from '@shared/constants/message.constants.ts';
import { BANK_ACCOUNT_NUMBER_REGEX, IFSC_CODE_REGEX } from '@shared/constants/regex.constants.ts';
import { z } from 'zod';

export const linkBankAccountBodySchema = z.object({
	accountHolderName: z.string().trim().min(2).max(100),
	accountNumber: z.string().regex(BANK_ACCOUNT_NUMBER_REGEX, MESSAGES.INVALID_BANK_ACCOUNT_NUMBER),
	ifsc: z.string().trim().toUpperCase().regex(IFSC_CODE_REGEX, MESSAGES.INVALID_IFSC_CODE),
});

export type LinkBankAccountBody = z.infer<typeof linkBankAccountBodySchema>;
