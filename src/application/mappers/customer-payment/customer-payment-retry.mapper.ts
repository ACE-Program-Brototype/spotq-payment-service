import type { RetryCustomerPaymentOutputDTO } from '@application/dtos/customer-payment/retry-customer-payment.dto.ts';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';

export const CustomerPaymentRetryMapper = {
	toDTO(tx: PaymentTransaction, keyId: string): RetryCustomerPaymentOutputDTO {
		return {
			transactionId: tx.id,
			orderId: tx.orderId,
			razorpayOrderId: tx.razorpayOrderId,
			amountPaise: tx.amountPaise,
			amountInRupees: tx.amountPaise / 100,
			currency: tx.currency,
			keyId,
		};
	},
};
