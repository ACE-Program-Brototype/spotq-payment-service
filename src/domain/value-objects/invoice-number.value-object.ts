import {
	INVOICE_NUMBER_PREFIX,
	INVOICE_RANDOM_MIN,
	INVOICE_RANDOM_RANGE,
} from '@domain/constants/subscription.constants.ts';

export class InvoiceNumber {
	private constructor(public readonly value: string) {}

	static generate(timestamp: number = Date.now()): string {
		const randomSuffix = Math.floor(INVOICE_RANDOM_MIN + Math.random() * INVOICE_RANDOM_RANGE);
		return `${INVOICE_NUMBER_PREFIX}-${timestamp}-${randomSuffix}`;
	}

	static of(value: string): InvoiceNumber {
		return new InvoiceNumber(value);
	}

	toString(): string {
		return this.value;
	}
}
