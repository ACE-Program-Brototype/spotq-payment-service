import { AdminSubscriberMapper } from '@application/mappers/admin-subscribers/admin-subscriber.mapper.ts';
import type { IRestaurantServiceClient } from '@application/ports/external/restaurant-service.client.port.ts';
import { GetAdminSubscriberDetailsUseCase } from '@application/use-cases/admin-subscribers/get-admin-subscriber-details.use-case.ts';
import { GetAdminSubscribersUseCase } from '@application/use-cases/admin-subscribers/get-admin-subscribers.use-case.ts';
import { SubscriberNotFoundError } from '@domain/errors/payment.errors.ts';
import type { ISubscriptionRepository } from '@domain/repositories/subscription.repository.interface.ts';

describe('Admin Subscribers Use Cases', () => {
	let mockSubscriptionRepository: jest.Mocked<ISubscriptionRepository>;
	let mockRestaurantServiceClient: jest.Mocked<IRestaurantServiceClient>;

	const mockDate = new Date('2026-09-01T00:00:00.000Z');
	const mockEndDate = new Date('2026-10-01T00:00:00.000Z');

	const mockSubscriberSummary = {
		id: 'b2b1b3b4-1111-4111-8111-111111111111',
		restaurantId: 'c2c1c3c4-2222-4222-8222-222222222222',
		planId: 'd2d1d3d4-3333-4333-8333-333333333333',
		status: 'ACTIVE',
		currentPeriodStart: mockDate,
		currentPeriodEnd: mockEndDate,
		canceledAt: null,
		createdAt: mockDate,
		updatedAt: mockDate,
		plan: {
			id: 'd2d1d3d4-3333-4333-8333-333333333333',
			code: 'QUEUE_PRO',
			name: 'Queue Pro',
			description: 'Queue management plan',
			pricePaise: 149900,
			currency: 'INR',
			billingCycle: 'MONTHLY',
			features: ['SMS Notifications'],
			isActive: true,
		},
	};

	beforeEach(() => {
		mockSubscriptionRepository = {
			findActiveByRestaurantId: jest.fn(),
			findById: jest.fn(),
			create: jest.fn(),
			activateSubscriptionWithOutbox: jest.fn(),
			findSubscribersPaginated: jest.fn(),
			findSubscriberDetailById: jest.fn(),
		} as unknown as jest.Mocked<ISubscriptionRepository>;

		mockRestaurantServiceClient = {
			getRestaurants: jest.fn().mockResolvedValue(
				new Map([
					[
						'c2c1c3c4-2222-4222-8222-222222222222',
						{
							id: 'c2c1c3c4-2222-4222-8222-222222222222',
							restaurantName: "Ajex's Bistro",
							ownerName: 'Ajex Joshy',
							ownerEmail: 'ajex@example.com',
							status: 'ACTIVE',
							isBlocked: false,
						},
					],
				]),
			),
			getRestaurantById: jest.fn().mockResolvedValue({
				id: 'c2c1c3c4-2222-4222-8222-222222222222',
				restaurantName: "Ajex's Bistro",
				ownerName: 'Ajex Joshy',
				ownerEmail: 'ajex@example.com',
				status: 'ACTIVE',
				isBlocked: false,
			}),
		};
	});

	describe('GetAdminSubscribersUseCase', () => {
		it('should retrieve a paginated list of subscribers with default parameters', async () => {
			mockSubscriptionRepository.findSubscribersPaginated.mockResolvedValue({
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

			const useCase = new GetAdminSubscribersUseCase(
				mockSubscriptionRepository,
				mockRestaurantServiceClient,
			);
			const result = await useCase.execute({});

			expect(mockSubscriptionRepository.findSubscribersPaginated).toHaveBeenCalledWith({
				page: 1,
				limit: 10,
				status: undefined,
				search: undefined,
				sortBy: undefined,
				sortOrder: undefined,
			});
			expect(mockRestaurantServiceClient.getRestaurants).toHaveBeenCalledWith([
				mockSubscriberSummary.restaurantId,
			]);

			expect(result.subscribers).toHaveLength(1);
			expect(result.subscribers[0].id).toBe(mockSubscriberSummary.id);
			expect(result.subscribers[0].restaurantId).toBe(mockSubscriberSummary.restaurantId);
			expect(result.subscribers[0].restaurantName).toBe("Ajex's Bistro");
			expect(result.subscribers[0].subscriberName).toBe('Ajex Joshy');
			expect(result.subscribers[0].subscriberEmail).toBe('ajex@example.com');
			expect(result.subscribers[0].currentPeriodStart).toBe(mockDate.toISOString());
			expect(result.subscribers[0].currentPeriodEnd).toBe(mockEndDate.toISOString());
			expect(result.subscribers[0].plan.code).toBe('QUEUE_PRO');
			expect(result.pagination.totalItems).toBe(1);
		});

		it('should pass through filter, search, and sorting parameters', async () => {
			mockSubscriptionRepository.findSubscribersPaginated.mockResolvedValue({
				subscribers: [],
				pagination: {
					page: 2,
					limit: 20,
					totalItems: 0,
					totalPages: 0,
					hasNextPage: false,
					hasPrevPage: true,
				},
			});

			const useCase = new GetAdminSubscribersUseCase(
				mockSubscriptionRepository,
				mockRestaurantServiceClient,
			);
			const result = await useCase.execute({
				page: 2,
				limit: 20,
				status: 'EXPIRED',
				search: 'Queue Pro',
				sortBy: 'currentPeriodEnd',
				sortOrder: 'asc',
			});

			expect(mockSubscriptionRepository.findSubscribersPaginated).toHaveBeenCalledWith({
				page: 2,
				limit: 20,
				status: 'EXPIRED',
				search: 'Queue Pro',
				sortBy: 'currentPeriodEnd',
				sortOrder: 'asc',
			});

			expect(result.subscribers).toEqual([]);
			expect(result.pagination.page).toBe(2);
			expect(result.pagination.hasPrevPage).toBe(true);
		});
	});

	describe('GetAdminSubscriberDetailsUseCase', () => {
		it('should return subscriber details when subscriber exists', async () => {
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

			mockSubscriptionRepository.findSubscriberDetailById.mockResolvedValue(mockSubscriberDetail);

			const useCase = new GetAdminSubscriberDetailsUseCase(
				mockSubscriptionRepository,
				mockRestaurantServiceClient,
			);
			const result = await useCase.execute({
				subscriberId: mockSubscriberSummary.id,
			});

			expect(mockSubscriptionRepository.findSubscriberDetailById).toHaveBeenCalledWith(
				mockSubscriberSummary.id,
			);
			expect(result.id).toBe(mockSubscriberSummary.id);
			expect(result.restaurantId).toBe(mockSubscriberSummary.restaurantId);
			expect(result.restaurantName).toBe("Ajex's Bistro");
			expect(result.subscriberName).toBe('Ajex Joshy');
			expect(result.transactions).toHaveLength(1);
			expect(result.transactions[0].id).toBe('e2e1e3e4-4444-4444-8444-444444444444');
			expect(result.invoices).toHaveLength(1);
			expect(result.invoices[0].invoiceNumber).toBe('INV-2026-001');
		});

		it('should throw SubscriberNotFoundError when subscriber does not exist', async () => {
			mockSubscriptionRepository.findSubscriberDetailById.mockResolvedValue(null);

			const useCase = new GetAdminSubscriberDetailsUseCase(
				mockSubscriptionRepository,
				mockRestaurantServiceClient,
			);

			await expect(
				useCase.execute({
					subscriberId: 'non-existent-id',
				}),
			).rejects.toThrow(SubscriberNotFoundError);
		});
	});

	describe('AdminSubscriberMapper', () => {
		it('should map subscriber summary to DTO with ISO date strings and restaurant info', () => {
			const dto = AdminSubscriberMapper.toSummaryDto(mockSubscriberSummary, {
				id: mockSubscriberSummary.restaurantId,
				restaurantName: 'The Grand Diner',
				ownerName: 'Bob Smith',
				ownerEmail: 'bob@example.com',
				status: 'ACTIVE',
				isBlocked: false,
			});

			expect(dto.id).toBe(mockSubscriberSummary.id);
			expect(dto.restaurantName).toBe('The Grand Diner');
			expect(dto.subscriberName).toBe('Bob Smith');
			expect(dto.subscriberEmail).toBe('bob@example.com');
			expect(dto.currentPeriodStart).toBe('2026-09-01T00:00:00.000Z');
			expect(dto.currentPeriodEnd).toBe('2026-10-01T00:00:00.000Z');
			expect(dto.canceledAt).toBeNull();
			expect(dto.plan.code).toBe('QUEUE_PRO');
		});

		it('should map subscriber details including transactions and invoices to DTO', () => {
			const detail = {
				...mockSubscriberSummary,
				transactions: [
					{
						id: 'tx-1',
						amountPaise: 149900,
						currency: 'INR',
						status: 'SUCCESS',
						razorpayOrderId: 'order-1',
						razorpayPaymentId: 'pay-1',
						createdAt: mockDate,
					},
				],
				invoices: [
					{
						id: 'inv-1',
						invoiceNumber: 'INV-001',
						amountPaise: 149900,
						currency: 'INR',
						status: 'PAID',
						paidAt: mockDate,
						createdAt: mockDate,
					},
				],
			};

			const dto = AdminSubscriberMapper.toDetailsDto(detail, {
				id: mockSubscriberSummary.restaurantId,
				restaurantName: 'The Grand Diner',
				ownerName: 'Bob Smith',
				ownerEmail: 'bob@example.com',
				status: 'ACTIVE',
				isBlocked: false,
			});

			expect(dto.id).toBe(detail.id);
			expect(dto.restaurantName).toBe('The Grand Diner');
			expect(dto.subscriberName).toBe('Bob Smith');
			expect(dto.transactions).toHaveLength(1);
			expect(dto.transactions[0].id).toBe('tx-1');
			expect(dto.invoices).toHaveLength(1);
			expect(dto.invoices[0].invoiceNumber).toBe('INV-001');
		});
	});
});
