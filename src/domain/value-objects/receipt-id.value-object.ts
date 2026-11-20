import { PAYMENT_RECEIPT } from '@shared/constants/index.ts';

export class ReceiptId {
	private constructor(public readonly value: string) {}

	static forOrder(orderId: string): string {
		const cleanId = orderId.replace(PAYMENT_RECEIPT.STRIP_HYPHENS_REGEX, '');
		return `${PAYMENT_RECEIPT.ORDER_PREFIX}${cleanId.slice(0, PAYMENT_RECEIPT.MAX_ID_LENGTH)}`;
	}

	static forSubscription(restaurantId: string, timestamp: number = Date.now()): string {
		const cleanId = restaurantId
			.replace(PAYMENT_RECEIPT.STRIP_HYPHENS_REGEX, '')
			.slice(0, PAYMENT_RECEIPT.SUBSCRIPTION_RESTAURANT_ID_LENGTH);
		return `${PAYMENT_RECEIPT.SUBSCRIPTION_PREFIX}${cleanId}_${timestamp}`;
	}

	static of(value: string): ReceiptId {
		return new ReceiptId(value);
	}

	toString(): string {
		return this.value;
	}
}
