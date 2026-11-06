import { RestaurantServiceClient } from '@infrastructure/services/restaurant-service.client.ts';

describe('RestaurantServiceClient', () => {
	let client: RestaurantServiceClient;
	const originalFetch = global.fetch;

	beforeEach(() => {
		client = new RestaurantServiceClient();
		global.fetch = jest.fn() as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('should return empty Map if restaurantIds is empty array', async () => {
		const result = await client.getRestaurants([]);
		expect(result.size).toBe(0);
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('should call batch endpoint with POST and S2S Authorization header', async () => {
		const id1 = 'c2c1c3c4-2222-4222-8222-222222222222';
		const mockResponse = {
			success: true,
			data: [
				{
					id: id1,
					restaurantName: 'Spice Garden',
					ownerName: 'Alice Chef',
					ownerEmail: 'alice@example.com',
					status: 'ACTIVE',
					isBlocked: false,
				},
			],
		};

		(global.fetch as unknown as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => mockResponse,
		});

		const result = await client.getRestaurants([id1]);

		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/internal/v1/restaurants/batch'),
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
					'x-caller-service': 'payment-service',
					Authorization: expect.stringMatching(/^Bearer /),
				}),
				body: JSON.stringify({ restaurantIds: [id1] }),
			}),
		);

		expect(result.size).toBe(1);
		expect(result.get(id1)).toEqual({
			id: id1,
			restaurantName: 'Spice Garden',
			ownerName: 'Alice Chef',
			ownerEmail: 'alice@example.com',
			status: 'ACTIVE',
			isBlocked: false,
		});
	});

	it('should return null when getRestaurantById is called with empty or invalid id', async () => {
		const result = await client.getRestaurantById('');
		expect(result).toBeNull();
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('should return restaurant info when getRestaurantById finds a match', async () => {
		const id = 'c2c1c3c4-2222-4222-8222-222222222222';
		const mockResponse = {
			success: true,
			data: [
				{
					id,
					restaurantName: 'Spice Garden',
					ownerName: 'Alice Chef',
					ownerEmail: 'alice@example.com',
					status: 'ACTIVE',
					isBlocked: false,
				},
			],
		};

		(global.fetch as unknown as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => mockResponse,
		});

		const result = await client.getRestaurantById(id);

		expect(result).toEqual({
			id,
			restaurantName: 'Spice Garden',
			ownerName: 'Alice Chef',
			ownerEmail: 'alice@example.com',
			status: 'ACTIVE',
			isBlocked: false,
		});
	});

	it('should handle fetch failure gracefully and return empty map', async () => {
		(global.fetch as unknown as jest.Mock).mockRejectedValue(new Error('Network failure'));

		const result = await client.getRestaurants(['some-id']);
		expect(result.size).toBe(0);
	});
});
