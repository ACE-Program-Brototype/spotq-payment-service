import type { CreateOrderPaymentOutput } from '@application/dtos/create-order-payment.dto.ts';
import type { GetOrderPaymentStatusOutput } from '@application/dtos/get-order-payment-status.dto.ts';
import type { VerifyOrderPaymentOutput } from '@application/dtos/verify-order-payment.dto.ts';
import type { PaymentTransaction } from '@domain/entities/payment-transaction.entity.ts';
import { PAYMENT_STATUS } from '@shared/constants/index.ts';

export const OrderPaymentMapper = {
	toCreateResponse(transaction: PaymentTransaction, keyId: string): CreateOrderPaymentOutput {
		return {
			paymentId: transaction.id,
			orderId: transaction.orderId ?? '',
			razorpayOrderId: transaction.razorpayOrderId,
			gatewayOrderId: transaction.razorpayOrderId,
			amountPaise: transaction.amountPaise,
			currency: transaction.currency,
			keyId,
		};
	},

	toStatusResponse(transaction: PaymentTransaction): GetOrderPaymentStatusOutput {
		return {
			orderId: transaction.orderId ?? '',
			paymentId: transaction.id,
			gatewayPaymentId: transaction.razorpayPaymentId,
			razorpayOrderId: transaction.razorpayOrderId,
			amountPaise: transaction.amountPaise,
			currency: transaction.currency,
			status: transaction.status,
			method: transaction.paymentMethod,
			createdAt: (transaction.createdAt ?? new Date()).toISOString(),
		};
	},

	toVerifyResponse(transaction: PaymentTransaction, verifiedAt?: Date): VerifyOrderPaymentOutput {
		return {
			paymentId: transaction.id,
			orderId: transaction.orderId ?? '',
			gatewayPaymentId: transaction.razorpayPaymentId ?? '',
			status: PAYMENT_STATUS.CAPTURED,
			verifiedAt: (verifiedAt ?? transaction.updatedAt ?? new Date()).toISOString(),
		};
	},
};
