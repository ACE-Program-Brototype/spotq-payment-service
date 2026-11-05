import type { IRestaurantServiceClient } from '@application/ports/external/restaurant-service.client.port.ts';
import { container } from '@di/container.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';
import { HTTP_STATUS, MESSAGES, SUBSCRIBER_ROUTES } from '@shared/constants/index.ts';
import request from 'supertest';
import app from '../src/app.ts';

const subscriptionRepository = container.get<ISubscriptionRepository>(
	TYPES.Repositories.SubscriptionRepository,
);
const restaurantServiceClient = container.get<IRestaurantServiceClient>(
	TYPES.Clients.RestaurantServiceClient,
);

describe('Admin Subscribers API Routes (HTTP Integration)', () => {
	const validSubscriberId = 'b2b1b3b4-1111-4111-8111-111111111111';
	const validRestaurantId = 'c2c1c3c4-2222-4222-8222-222222222222';
	const validPlanId = 'd2d1d3d4-3333-4333-8333-333333333333';

	const adminHeaders = {
		'x-user-id': 'a2a1a3a4-9999-4999-8999-999999999999',
		'x-user-role': 'admin',
		'x-user-email': 'admin@spotq.com',
	};

	const mockDate = new Date('2026-09-01T00:00:00.000Z');
	const mockEndDate = new Date('2026-10-01T00:00:00.000Z');

	const mockSubscriberSummary = {
		id: validSubscriberId,
		restaurantId: validRestaurantId,
		planId: validPlanId,
		status: 'ACTIVE' as const,
		currentPeriodStart: mockDate,
		currentPeriodEnd: mockEndDate,
		canceledAt: null,
		createdAt: mockDate,
		updatedAt: mockDate,
		plan: {
			id: validPlanId,
			code: 'QUEUE_PRO',
			name: 'Queue Pro',
			description: 'Queue management plan',
			pricePaise: 149900,
			currency: 'INR',
			billingCycle: 'MONTHLY' as const,
			features: ['SMS Notifications'],
			isActive: true,
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(restaurantServiceClient, 'getRestaurants').mockResolvedValue(
			new Map([
				[
					validRestaurantId,
					{
						id: validRestaurantId,
						restaurantName: 'Biryani Blues',
						ownerName: 'Rahul Sharma',
						ownerEmail: 'rahul@biryaniblues.com',
						status: 'ACTIVE',
						isBlocked: false,
					},
				],
			]),
		);
		jest.spyOn(restaurantServiceClient, 'getRestaurantById').mockResolvedValue({
			id: validRestaurantId,
			restaurantName: 'Biryani Blues',
			ownerName: 'Rahul Sharma',
			ownerEmail: 'rahul@biryaniblues.com',
			status: 'ACTIVE',
			isBlocked: false,
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe(`GET ${SUBSCRIBER_ROUTES.API_V1_BASE} (List Subscribers)`, () => {
		it('should return 401 Unauthorized when x-user-id header is missing', async () => {
			const res = await request(app)
				.get(SUBSCRIBER_ROUTES.API_V1_BASE)
				.set('x-user-role', 'admin')
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe(MESSAGES.GATEWAY_UNAUTHORIZED);
		});

		it('should return 403 Forbidden when x-user-role is not admin', async () => {
			const res = await request(app)
				.get(SUBSCRIBER_ROUTES.API_V1_BASE)
				.set({
					'x-user-id': '99999999-9999-9999-9999-999999999999',
					'x-user-role': 'staff',
				})
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe(MESSAGES.ADMIN_FORBIDDEN);
		});

		it('should return 200 OK and paginated subscriber records for platform admin', async () => {
			jest.spyOn(subscriptionRepository, 'findSubscribersPaginated').mockResolvedValueOnce({
				subscribers: [mockSubscriberSummary],
				pagination: {
					page: 1,
					limit: 10,
					totalItems: 1,
					totalPages: 1,
					hasNextPage: false,
					hasPrevPage: false,
				},
			});

			const res = await request(app)
				.get(SUBSCRIBER_ROUTES.API_V1_BASE)
				.set(adminHeaders)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(MESSAGES.SUBSCRIBERS_RETRIEVED);
			expect(res.body.data.subscribers).toHaveLength(1);
			expect(res.body.data.subscribers[0].id).toBe(mockSubscriberSummary.id);
			expect(res.body.data.subscribers[0].plan.code).toBe('QUEUE_PRO');
			expect(res.body.data.pagination.totalItems).toBe(1);
			expect(res.body.data.pagination.page).toBe(1);
		});

		it('should handle filters, search, and sorting query parameters', async () => {
			const repoSpy = jest
				.spyOn(subscriptionRepository, 'findSubscribersPaginated')
				.mockResolvedValueOnce({
					subscribers: [],
					pagination: {
						page: 2,
						limit: 5,
						totalItems: 0,
						totalPages: 0,
						hasNextPage: false,
						hasPrevPage: true,
					},
				});

			const res = await request(app)
				.get(
					`${SUBSCRIBER_ROUTES.API_V1_BASE}?page=2&limit=5&status=ACTIVE&search=QUEUE&sortBy=currentPeriodEnd&sortOrder=asc`,
				)
				.set(adminHeaders)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(repoSpy).toHaveBeenCalledWith({
				page: 2,
				limit: 5,
				status: 'ACTIVE',
				search: 'QUEUE',
				sortBy: 'currentPeriodEnd',
				sortOrder: 'asc',
			});
		});

		it('should return 422 Unprocessable Entity on invalid pagination query parameters', async () => {
			const res = await request(app)
				.get(`${SUBSCRIBER_ROUTES.API_V1_BASE}?page=0&limit=999`)
				.set(adminHeaders)
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
		});

		it('should also work on the route alias /subscribers', async () => {
			jest.spyOn(subscriptionRepository, 'findSubscribersPaginated').mockResolvedValueOnce({
				subscribers: [mockSubscriberSummary],
				pagination: {
					page: 1,
					limit: 10,
					totalItems: 1,
					totalPages: 1,
					hasNextPage: false,
					hasPrevPage: false,
				},
			});

			const res = await request(app)
				.get(SUBSCRIBER_ROUTES.BASE)
				.set(adminHeaders)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.subscribers).toHaveLength(1);
		});
	});

	describe(`GET ${SUBSCRIBER_ROUTES.API_V1_BY_ID} (Get Subscriber Details)`, () => {
		it('should return 401 Unauthorized when x-user-id is missing', async () => {
			const res = await request(app)
				.get(`${SUBSCRIBER_ROUTES.API_V1_BASE}/${validSubscriberId}`)
				.set('x-user-role', 'admin')
				.expect(HTTP_STATUS.UNAUTHORIZED);

			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe(MESSAGES.GATEWAY_UNAUTHORIZED);
		});

		it('should return 403 Forbidden when x-user-role is not admin', async () => {
			const res = await request(app)
				.get(`${SUBSCRIBER_ROUTES.API_V1_BASE}/${validSubscriberId}`)
				.set({
					'x-user-id': '99999999-9999-9999-9999-999999999999',
					'x-user-role': 'customer',
				})
				.expect(HTTP_STATUS.FORBIDDEN);

			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe(MESSAGES.ADMIN_FORBIDDEN);
		});

		it('should return 422 Unprocessable Entity when subscriberId is not a valid UUID', async () => {
			const res = await request(app)
				.get(`${SUBSCRIBER_ROUTES.API_V1_BASE}/invalid-not-a-uuid`)
				.set(adminHeaders)
				.expect(HTTP_STATUS.UNPROCESSABLE_ENTITY);

			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe(MESSAGES.VALIDATION_ERROR);
		});

		it('should return 404 Not Found when subscriber does not exist', async () => {
			jest.spyOn(subscriptionRepository, 'findSubscriberDetailById').mockResolvedValueOnce(null);

			const res = await request(app)
				.get(`${SUBSCRIBER_ROUTES.API_V1_BASE}/${validSubscriberId}`)
				.set(adminHeaders)
				.expect(HTTP_STATUS.NOT_FOUND);

			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe(MESSAGES.SUBSCRIBER_NOT_FOUND);
		});

		it('should return 200 OK with subscriber details including transactions and invoices', async () => {
			const mockSubscriberDetail = {
				...mockSubscriberSummary,
				transactions: [
					{
						id: 'e2e1e3e4-4444-4444-8444-444444444444',
						amountPaise: 149900,
						currency: 'INR',
						status: 'SUCCESS',
						razorpayOrderId: 'order_123',
						razorpayPaymentId: 'pay_123',
						createdAt: mockDate,
					},
				],
				invoices: [
					{
						id: 'f2f1f3f4-5555-4555-8555-555555555555',
						invoiceNumber: 'INV-2026-001',
						amountPaise: 149900,
						currency: 'INR',
						status: 'PAID',
						paidAt: mockDate,
						createdAt: mockDate,
					},
				],
			};

			jest
				.spyOn(subscriptionRepository, 'findSubscriberDetailById')
				.mockResolvedValueOnce(mockSubscriberDetail);

			const res = await request(app)
				.get(`${SUBSCRIBER_ROUTES.API_V1_BASE}/${validSubscriberId}`)
				.set(adminHeaders)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe(MESSAGES.SUBSCRIBER_DETAILS_RETRIEVED);
			expect(res.body.data.id).toBe(validSubscriberId);
			expect(res.body.data.plan.code).toBe('QUEUE_PRO');
			expect(res.body.data.transactions).toHaveLength(1);
			expect(res.body.data.transactions[0].id).toBe('e2e1e3e4-4444-4444-8444-444444444444');
			expect(res.body.data.invoices).toHaveLength(1);
			expect(res.body.data.invoices[0].invoiceNumber).toBe('INV-2026-001');
		});

		it('should also work on the route alias /subscribers/:subscriberId', async () => {
			const mockSubscriberDetail = {
				...mockSubscriberSummary,
				transactions: [],
				invoices: [],
			};

			jest
				.spyOn(subscriptionRepository, 'findSubscriberDetailById')
				.mockResolvedValueOnce(mockSubscriberDetail);

			const res = await request(app)
				.get(`${SUBSCRIBER_ROUTES.BASE}/${validSubscriberId}`)
				.set(adminHeaders)
				.expect(HTTP_STATUS.OK);

			expect(res.body.success).toBe(true);
			expect(res.body.data.id).toBe(validSubscriberId);
		});
	});
});
