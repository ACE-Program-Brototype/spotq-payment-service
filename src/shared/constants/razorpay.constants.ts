export const RAZORPAY_HTTP_METHOD = {
	GET: 'GET',
	POST: 'POST',
	PATCH: 'PATCH',
} as const;

export const RAZORPAY_X_BASE_URL = 'https://api.razorpay.com/v1/';

export const RAZORPAY_X_PATH = {
	CONTACTS: 'contacts',
	FUND_ACCOUNTS: 'fund_accounts',
	PAYOUTS: 'payouts',
} as const;

export type RazorpayHttpMethod = (typeof RAZORPAY_HTTP_METHOD)[keyof typeof RAZORPAY_HTTP_METHOD];
