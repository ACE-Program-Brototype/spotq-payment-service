import type Razorpay from 'razorpay';

// Reusable singleton Razorpay client instance
export let razorpayClient: Razorpay | null = null;

export const setRazorpayClient = (client: Razorpay): void => {
	razorpayClient = client;
};
