export interface AuthenticatedUser {
	userId: string;
	email: string;
	role: string;
	restaurantId?: string;
}

declare global {
	namespace Express {
		interface Request {
			userId?: string;
			user?: AuthenticatedUser;
		}
	}
}
