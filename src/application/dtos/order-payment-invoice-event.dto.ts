export interface OrderPaymentInvoiceItemAddonDTO {
	addonId: string;
	addonName: string;
	price: number;
}

export interface OrderPaymentInvoiceItemDTO {
	menuItemId: string;
	itemName: string;
	variantId?: string | null;
	variantName?: string | null;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	specialInstructions?: string | null;
	addons: OrderPaymentInvoiceItemAddonDTO[];
}

export interface OrderPaymentInvoiceFinancialsDTO {
	subtotal: number;
	taxAmount: number;
	taxPercent?: number;
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
	tableNumber?: number | null;
	queueEntryId?: string | null;
	paymentMode: string;
	paymentStatus: string;
	orderStatus: string;
	currency: string;
	specialInstructions?: string | null;
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
