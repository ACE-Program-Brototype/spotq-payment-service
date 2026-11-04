export interface ListAdminSubscribersQueryDTO {
	page?: number;
	limit?: number;
	status?: string | null;
	search?: string | null;
	sortBy?: 'createdAt' | 'currentPeriodEnd' | 'currentPeriodStart' | 'status';
	sortOrder?: 'asc' | 'desc';
}

export interface AdminSubscriberPlanDTO {
	id: string;
	code: string;
	name: string;
	description?: string | null;
	pricePaise: number;
	currency: string;
	billingCycle: string;
	features?: unknown;
	isActive: boolean;
}

export interface AdminSubscriberSummaryDTO {
	id: string;
	restaurantId: string;
	planId: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	canceledAt: string | null;
	createdAt: string;
	updatedAt: string;
	plan: AdminSubscriberPlanDTO;
}

export interface AdminSubscribersPaginationDTO {
	page: number;
	limit: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface ListAdminSubscribersOutputDTO {
	subscribers: AdminSubscriberSummaryDTO[];
	pagination: AdminSubscribersPaginationDTO;
}
