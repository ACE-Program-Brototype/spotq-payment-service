export enum TransactionQueryStatus {
	ALL = 'ALL',
	SUCCESS = 'SUCCESS',
	PENDING = 'PENDING',
	FAILED = 'FAILED',
	REFUNDED = 'REFUNDED',
}

export enum TransactionPaymentMethod {
	ALL = 'ALL',
	UPI = 'UPI',
	CARD = 'CARD',
	NETBANKING = 'NETBANKING',
}

export enum TransactionSortField {
	CREATED_AT = 'createdAt',
	AMOUNT_PAISE = 'amountPaise',
}

export enum SortDirection {
	ASC = 'asc',
	DESC = 'desc',
}
