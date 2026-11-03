export {};

declare global {
	namespace Express {
		interface Request {
			user?: {
				userId: string;
				restaurantId?: string;
				email?: string;
				role: string;
			};
		}
	}
}
