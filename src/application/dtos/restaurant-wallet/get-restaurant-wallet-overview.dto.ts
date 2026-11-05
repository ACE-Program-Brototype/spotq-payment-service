export interface GetRestaurantWalletOverviewOutputDTO {
	walletId: string | null;
	restaurantId: string;
	balancePaise: number;
	currency: string;
	isLocked: boolean;
	linkedBankAccount: {
		isLinked: boolean;
		bankName: string | null;
		accountNumberMasked: string | null;
	} | null;
	todayStats: {
		todayCreditsPaise: number;
		todayRefundsPaise: number;
		withdrawnPaise: number;
		pendingPayoutsCount: number;
	};
}
