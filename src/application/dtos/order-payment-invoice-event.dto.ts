export interface OrderPaymentInvoiceItemAddonDTO {
	addonId: string;
	addonName: string;
	price: number;
}

export interface OrderPaymentInvoiceItemDTO {
	menuItemId: string;
	itemName: string;
	variantId?: string | null | undefined;
	variantName?: string | null | undefined;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	specialInstructions?: string | null | undefined;
	addons: OrderPaymentInvoiceItemAddonDTO[];
}

export interface OrderPaymentInvoiceFinancialsDTO {
	subtotal: number;
	taxAmount: number;
	taxPercent?: number | undefined;
	platformFee: number;
	discountAmount: number;
	grandTotal: number;
	amountPaise: number;
}

export interface OrderInvoiceDataDTO {
	orderId: string;
	orderNumber: string;
	paymentId: string | null;
	restaurantId: string;
	restaurantName: string | null;
	customerId: string | null;
	customerName: string | null;
	customerPhone: string | null;
	orderingMode: string;
	tableNumber?: number | null | undefined;
	queueEntryId?: string | null | undefined;
	paymentMode: string;
	paymentStatus: string;
	orderStatus: string;
	currency: string;
	specialInstructions?: string | null | undefined;
	financials: OrderPaymentInvoiceFinancialsDTO;
	items: OrderPaymentInvoiceItemDTO[];
	createdAt: string;
	confirmedAt: string;
}

export interface OrderPaymentInvoiceEventDTO {
	eventId: string;
	eventType: string;
	aggregateId: string;
	timestamp: string;
	orderData: OrderInvoiceDataDTO;
}
