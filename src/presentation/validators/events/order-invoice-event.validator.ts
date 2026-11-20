import { z } from 'zod';

export const orderInvoiceItemAddonSchema = z.object({
	addonId: z.string(),
	addonName: z.string(),
	price: z.number(),
});

export const orderInvoiceItemSchema = z.object({
	menuItemId: z.string(),
	itemName: z.string(),
	variantId: z.string().nullable().optional(),
	variantName: z.string().nullable().optional(),
	quantity: z.number().int().positive(),
	unitPrice: z.number(),
	totalPrice: z.number(),
	specialInstructions: z.string().nullable().optional(),
	addons: z.array(orderInvoiceItemAddonSchema).default([]),
});

export const orderInvoiceFinancialsSchema = z.object({
	subtotal: z.number(),
	taxAmount: z.number(),
	taxPercent: z.number().optional(),
	platformFee: z.number().default(0),
	discountAmount: z.number().default(0),
	grandTotal: z.number(),
	amountPaise: z.number().int(),
});

export const orderInvoiceDataSchema = z.object({
	orderId: z.string(),
	orderNumber: z.string(),
	paymentId: z.string().nullable(),
	restaurantId: z.string(),
	restaurantName: z.string().nullable(),
	customerId: z.string().nullable(),
	customerName: z.string().nullable(),
	customerPhone: z.string().nullable(),
	orderingMode: z.string(),
	tableNumber: z.number().nullable().optional(),
	queueEntryId: z.string().nullable().optional(),
	paymentMode: z.string(),
	paymentStatus: z.string(),
	orderStatus: z.string(),
	currency: z.string().default('INR'),
	specialInstructions: z.string().nullable().optional(),
	financials: orderInvoiceFinancialsSchema,
	items: z.array(orderInvoiceItemSchema),
	createdAt: z.string(),
	confirmedAt: z.string(),
});

export const orderPaymentInvoiceEventSchema = z.object({
	eventId: z.string(),
	eventType: z.string(),
	aggregateId: z.string(),
	timestamp: z.string(),
	orderData: orderInvoiceDataSchema,
});

export type OrderPaymentInvoiceEventValidated = z.infer<typeof orderPaymentInvoiceEventSchema>;
