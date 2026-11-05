import type { RestaurantInfoDTO } from '@application/dtos/external/restaurant-info.dto.ts';
import type { IRestaurantServiceClient } from '@application/ports/external/restaurant-service.client.port.ts';
import { config } from '@config/env.ts';
import { logger } from '@infrastructure/logger/logger.ts';
import { S2S_CALLER_SERVICES } from '@shared/constants/auth.constants.ts';
import { RESTAURANT_SERVICE_ROUTES } from '@shared/constants/routes.constants.ts';
import { generateToken, type TokenIssuerConfig } from '@spotq-org/s2s-core';
import { injectable } from 'inversify';

interface RestaurantBatchItemApiResponse {
	id: string;
	restaurantName: string;
	ownerName: string;
	ownerEmail: string;
	email: string;
	phone: string;
	status: string;
	onboardingStatus: string;
	isBlocked: boolean;
	blockReason: string | null;
	isSubscriptionActive: boolean;
	subscriptionPlanCode: string | null;
	subscriptionEndsAt: string | null;
}

interface RestaurantApiResponse {
	success: boolean;
	data?: RestaurantBatchItemApiResponse[];
}

interface CachedToken {
	token: string;
	expiresAt: number;
}

@injectable()
export class RestaurantServiceClient implements IRestaurantServiceClient {
	private readonly baseUrl: string;
	private cachedToken: CachedToken | null = null;
	private readonly tokenTtlMs: number;

	constructor() {
		this.baseUrl = config.services.restaurantServiceUrl;
		this.tokenTtlMs = config.s2s.tokenTtlMs;
	}

	private getS2SToken(): string {
		const now = Date.now();
		if (this.cachedToken && this.cachedToken.expiresAt > now) {
			return this.cachedToken.token;
		}

		const issuerConfig: TokenIssuerConfig = {
			serviceName: 'payment-service',
			privateKey: config.s2s.privateKey,
		};

		const token = generateToken(S2S_CALLER_SERVICES.RESTAURANT_SERVICE, issuerConfig);
		this.cachedToken = {
			token,
			expiresAt: now + this.tokenTtlMs,
		};

		return token;
	}

	public async getRestaurants(restaurantIds?: string[]): Promise<Map<string, RestaurantInfoDTO>> {
		const resultMap = new Map<string, RestaurantInfoDTO>();

		if (restaurantIds && restaurantIds.length === 0) {
			return resultMap;
		}

		const uniqueIds = restaurantIds
			? Array.from(new Set(restaurantIds.map((id) => id.trim()))).filter(Boolean)
			: [];

		if (restaurantIds && uniqueIds.length === 0) {
			return resultMap;
		}

		const url = `${this.baseUrl}${RESTAURANT_SERVICE_ROUTES.BATCH}`;

		try {
			const s2sToken = this.getS2SToken();
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'x-caller-service': 'payment-service',
					Authorization: `Bearer ${s2sToken}`,
				},
				body: JSON.stringify({ restaurantIds: uniqueIds }),
				signal: AbortSignal.timeout(5000),
			});

			if (!res.ok) {
				logger.warn(
					{ status: res.status, url },
					'Failed to fetch batch restaurants from restaurant service',
				);
				return resultMap;
			}

			const json = (await res.json()) as RestaurantApiResponse;
			const list = json?.data || [];

			for (const r of list) {
				resultMap.set(r.id, {
					id: r.id,
					restaurantName: r.restaurantName || 'SpotQ Restaurant',
					ownerName: r.ownerName || '-',
					ownerEmail: r.ownerEmail || r.email || '-',
					status: r.status || 'ACTIVE',
					isBlocked: Boolean(r.isBlocked),
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
		if (!id?.trim()) {
			return null;
		}

		const map = await this.getRestaurants([id.trim()]);
		return map.get(id.trim()) || null;
	}
}
