export interface LinkRestaurantWalletBankAccountInputDTO {
	accountHolderName: string;
	accountNumber: string;
	ifsc: string;
	restaurantId: string;
}

export interface LinkRestaurantWalletBankAccountOutputDTO {
	isLinked: true;
	bankName: string;
	accountNumberMasked: string;
	linkedAt: string;
}
