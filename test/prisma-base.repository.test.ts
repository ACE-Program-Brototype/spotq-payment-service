import { Prisma } from '@prisma/client';
import { PersistenceError } from '../src/infrastructure/errors/persistence.error';
import { PrismaBaseRepository } from '../src/infrastructure/repositories/prisma-base.repository';
import { HTTP_STATUS } from '../src/shared/constants';
import { AppError, BadRequestError, ConflictError } from '../src/shared/errors';

interface TestDomain {
	id: string;
	name: string;
}

interface TestRecord {
	id: string;
	title: string;
}

interface TestWhereInput {
	id?: string;
}

interface TestModelDelegate {
	findUnique: jest.Mock<Promise<TestRecord | null>, [{ where: { id: string } }]>;
	findMany: jest.Mock<
		Promise<TestRecord[]>,
		[{ where?: TestWhereInput; orderBy?: unknown; take?: number; skip?: number }]
	>;
	create: jest.Mock<Promise<TestRecord>, [{ data: { title: string } }]>;
	update: jest.Mock<Promise<TestRecord>, [{ where: { id: string }; data: { title?: string } }]>;
	delete: jest.Mock<Promise<TestRecord>, [{ where: { id: string } }]>;
	count: jest.Mock<Promise<number>, [{ where?: TestWhereInput }]>;
}

class TestRepository extends PrismaBaseRepository<
	TestDomain,
	TestRecord,
	TestWhereInput,
	{ name: string },
	{ name?: string },
	{ title: string },
	{ title?: string }
> {
	protected override getModel() {
		return (this.prisma as unknown as { testModel: TestModelDelegate }).testModel;
	}

	protected override mapToDomain(record: TestRecord): TestDomain {
		return { id: record.id, name: record.title };
	}

	protected override toCreatePersistence(data: { name: string }): { title: string } {
		return { title: data.name };
	}

	protected override toUpdatePersistence(data: { name?: string }): { title?: string } {
		return data.name !== undefined ? { title: data.name } : {};
	}
}

describe('PrismaBaseRepository', () => {
	let repository: TestRepository;
	let mockDelegate: TestModelDelegate;

	beforeEach(() => {
		mockDelegate = {
			findUnique: jest.fn(),
			findMany: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			count: jest.fn(),
		};
		repository = new TestRepository();
		(repository as unknown as { prisma: { testModel: typeof mockDelegate } }).prisma = {
			testModel: mockDelegate,
		};
	});

	it('finds a record by id and maps it to domain or returns null', async () => {
		mockDelegate.findUnique.mockResolvedValueOnce({ id: 'rec-1', title: 'Alpha' });
		await expect(repository.findById('rec-1')).resolves.toEqual({ id: 'rec-1', name: 'Alpha' });
		expect(mockDelegate.findUnique).toHaveBeenCalledWith({ where: { id: 'rec-1' } });

		mockDelegate.findUnique.mockResolvedValueOnce(null);
		await expect(repository.findById('missing')).resolves.toBeNull();
	});

	it('lists matching records with query options and maps each to domain', async () => {
		mockDelegate.findMany.mockResolvedValue([
			{ id: 'rec-1', title: 'One' },
			{ id: 'rec-2', title: 'Two' },
		]);

		const result = await repository.find({
			where: { id: 'rec-1' },
			orderBy: { createdAt: 'desc' },
			take: 10,
			skip: 5,
		});

		expect(mockDelegate.findMany).toHaveBeenCalledWith({
			where: { id: 'rec-1' },
			orderBy: { createdAt: 'desc' },
			take: 10,
			skip: 5,
		});
		expect(result).toEqual([
			{ id: 'rec-1', name: 'One' },
			{ id: 'rec-2', name: 'Two' },
		]);
	});

	it('creates, updates, deletes, and checks existence through base methods', async () => {
		mockDelegate.create.mockResolvedValue({ id: 'rec-1', title: 'Created' });
		await expect(repository.create({ name: 'Created' })).resolves.toEqual({
			id: 'rec-1',
			name: 'Created',
		});
		expect(mockDelegate.create).toHaveBeenCalledWith({ data: { title: 'Created' } });

		mockDelegate.update.mockResolvedValue({ id: 'rec-1', title: 'Updated' });
		await expect(repository.update('rec-1', { name: 'Updated' })).resolves.toEqual({
			id: 'rec-1',
			name: 'Updated',
		});
		expect(mockDelegate.update).toHaveBeenCalledWith({
			where: { id: 'rec-1' },
			data: { title: 'Updated' },
		});

		mockDelegate.delete.mockResolvedValue({ id: 'rec-1', title: 'Updated' });
		await expect(repository.delete('rec-1')).resolves.toBe(true);
		expect(mockDelegate.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } });

		mockDelegate.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
		await expect(repository.exists({ id: 'rec-1' })).resolves.toBe(true);
		await expect(repository.exists({ id: 'missing' })).resolves.toBe(false);
	});

	it('translates Prisma P2002, P2025, P2003, and generic known request errors', async () => {
		mockDelegate.create.mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
				code: 'P2002',
				clientVersion: '6.0.0',
				meta: { target: ['invoiceNumber'] },
			}),
		);
		await expect(repository.create({ name: 'Dup' })).rejects.toBeInstanceOf(ConflictError);

		mockDelegate.update.mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('Record not found', {
				code: 'P2025',
				clientVersion: '6.0.0',
			}),
		);
		await expect(repository.update('missing', { name: 'X' })).rejects.toMatchObject({
			statusCode: HTTP_STATUS.NOT_FOUND,
		});

		mockDelegate.create.mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
				code: 'P2003',
				clientVersion: '6.0.0',
				meta: { field_name: 'plan_id' },
			}),
		);
		await expect(repository.create({ name: 'BadFK' })).rejects.toBeInstanceOf(BadRequestError);

		mockDelegate.findUnique.mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('Connection pool timeout', {
				code: 'P2024',
				clientVersion: '6.0.0',
			}),
		);
		await expect(repository.findById('rec-1')).rejects.toBeInstanceOf(PersistenceError);

		mockDelegate.findUnique.mockRejectedValueOnce(
			new Prisma.PrismaClientKnownRequestError('Not found on findUniqueOrThrow', {
				code: 'P2025',
				clientVersion: '6.0.0',
			}),
		);
		await expect(repository.findById('rec-1')).rejects.toBeInstanceOf(AppError);
	});

	it('rethrows non-Prisma errors unchanged', async () => {
		const domainError = new Error('Unexpected business failure');
		mockDelegate.findUnique.mockRejectedValueOnce(domainError);

		await expect(repository.findById('rec-1')).rejects.toBe(domainError);
	});
});
