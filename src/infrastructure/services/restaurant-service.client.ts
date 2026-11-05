import type { RestaurantInfoDTO } from '@application/dtos/external/restaurant-info.dto.ts';
import type { IRestaurantServiceClient } from '@application/ports/external/restaurant-service.client.port.ts';
import { logger } from '@infrastructure/logger/logger.ts';
import { injectable } from 'inversify';

interface RestaurantApiRecord {
	id: string;
	restaurant_name?: string;
	restaurant?: string;
	owner_name?: string;
	owner?: string;
	owner_email?: string;
	email?: string;
	contact?: {
		email?: string;
		owner_email?: string;
	};
	status?: string;
	is_blocked?: boolean;
}

interface RestaurantApiResponse {
	success: boolean;
	data?:
		| {
				restaurants?: RestaurantApiRecord[];
		  }
		| RestaurantApiRecord;
}

@injectable()
export class RestaurantServiceClient implements IRestaurantServiceClient {
	private readonly baseUrl: string;

	constructor() {
		this.baseUrl = process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:3001';
	}

	public async getRestaurants(): Promise<Map<string, RestaurantInfoDTO>> {
		const resultMap = new Map<string, RestaurantInfoDTO>();
		const url = `${this.baseUrl}/admin/restaurants?limit=100`;

		try {
			const res = await fetch(url, {
				headers: {
					'x-user-id': 'system-admin',
					'x-user-role': 'admin',
				},
				signal: AbortSignal.timeout(5000),
			});

			if (!res.ok) {
				logger.warn(
					{ status: res.status, url },
					'Failed to fetch restaurants from restaurant service',
				);
				return resultMap;
			}

			const json = (await res.json()) as RestaurantApiResponse;
			const list = (json?.data as { restaurants?: RestaurantApiRecord[] })?.restaurants || [];

			for (const r of list) {
				resultMap.set(r.id, {
					id: r.id,
					restaurantName: r.restaurant_name || r.restaurant || 'SpotQ Restaurant',
					ownerName: r.owner_name || r.owner || '-',
					ownerEmail: r.owner_email || r.email || r.contact?.owner_email || r.contact?.email || '-',
					status: r.status || 'ACTIVE',
					isBlocked: Boolean(r.is_blocked),
				});
			}
		} catch (error) {
			logger.warn(
				{ error: error instanceof Error ? error.message : error },
				'Error calling restaurant service in getRestaurants',
			);
		}

		return resultMap;
	}

	public async getRestaurantById(id: string): Promise<RestaurantInfoDTO | null> {
		const url = `${this.baseUrl}/admin/restaurants/${id}`;

		try {
			const res = await fetch(url, {
				headers: {
					'x-user-id': 'system-admin',
					'x-user-role': 'admin',
				},
				signal: AbortSignal.timeout(5000),
			});

			if (!res.ok) {
				logger.warn(
					{ status: res.status, url, id },
					'Failed to fetch restaurant by ID from restaurant service',
				);
				return null;
			}

			const json = (await res.json()) as RestaurantApiResponse;
			const r = json?.data as RestaurantApiRecord;

			if (!r?.id) return null;

			return {
				id: r.id,
				restaurantName: r.restaurant_name || r.restaurant || 'SpotQ Restaurant',
				ownerName: r.owner_name || r.owner || '-',
				ownerEmail: r.owner_email || r.email || r.contact?.owner_email || r.contact?.email || '-',
				status: r.status || 'ACTIVE',
				isBlocked: Boolean(r.is_blocked),
			};
		} catch (error) {
			logger.warn(
				{ error: error instanceof Error ? error.message : error, id },
				'Error calling restaurant service in getRestaurantById',
			);
			return null;
		}
	}
}
