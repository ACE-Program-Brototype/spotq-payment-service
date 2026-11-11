import { prisma } from '@infrastructure/database/prisma.ts';
import { PersistenceError } from '@infrastructure/errors/persistence.error.ts';
import { Prisma, type PrismaClient } from '@prisma/client';
import { ERROR_CODES, HTTP_STATUS } from '@shared/constants/index.ts';
import { AppError, BadRequestError, ConflictError } from '@shared/errors/index.ts';
import { injectable } from 'inversify';

export interface PrismaFindOptions<TWhereInput = Record<string, unknown>> {
	where?: TWhereInput;
	orderBy?: unknown;
	take?: number;
	skip?: number;
}

export interface PrismaModelDelegate<
	TRecord = unknown,
	TWhereInput = Record<string, unknown>,
	TPersistenceCreateInput = unknown,
	TPersistenceUpdateInput = unknown,
> {
	findUnique(args: { where: { id: string } }): Promise<TRecord | null>;
	findMany(args?: {
		where?: TWhereInput;
		orderBy?: unknown;
		take?: number;
		skip?: number;
	}): Promise<TRecord[]>;
	create(args: { data: TPersistenceCreateInput }): Promise<TRecord>;
	update(args: { where: { id: string }; data: TPersistenceUpdateInput }): Promise<TRecord>;
	delete(args: { where: { id: string } }): Promise<TRecord>;
	count(args?: { where?: TWhereInput }): Promise<number>;
}

interface PrismaKnownRequestErrorLike {
	code: string;
	message: string;
	meta?: Record<string, unknown>;
}

function isPrismaKnownRequestError(error: unknown): error is PrismaKnownRequestErrorLike {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		return true;
	}
	if (typeof error === 'object' && error !== null && 'code' in error && 'name' in error) {
		return (
			(error as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
			typeof (error as { code?: unknown }).code === 'string'
		);
	}
	return false;
}

/**
 * Generic base repository wrapping Prisma client access, standard CRUD operations,
 * and centralized translation of Prisma known request errors.
 */
@injectable()
export abstract class PrismaBaseRepository<
	TDomain = unknown,
	TRecord = unknown,
	TWhereInput = Record<string, unknown>,
	TCreateInput = unknown,
	TUpdateInput = unknown,
	TPersistenceCreateInput = TCreateInput,
	TPersistenceUpdateInput = TUpdateInput,
> {
	protected readonly prisma: PrismaClient = prisma;

	protected getModel(): PrismaModelDelegate<
		TRecord,
		TWhereInput,
		TPersistenceCreateInput,
		TPersistenceUpdateInput
	> {
		throw new PersistenceError(`${this.constructor.name} does not configure a Prisma delegate`);
	}

	protected mapToDomain(_record: TRecord): TDomain {
		throw new PersistenceError(`${this.constructor.name} does not configure a persistence mapper`);
	}

	protected toCreatePersistence(data: TCreateInput): TPersistenceCreateInput {
		return data as unknown as TPersistenceCreateInput;
	}

	protected toUpdatePersistence(data: TUpdateInput): TPersistenceUpdateInput {
		return data as unknown as TPersistenceUpdateInput;
	}

	async findById(id: string): Promise<TDomain | null> {
		const record = await this.executePrisma(() => this.getModel().findUnique({ where: { id } }));
		return record ? this.mapToDomain(record) : null;
	}

	async find(options?: PrismaFindOptions<TWhereInput>): Promise<TDomain[]> {
		const records = await this.executePrisma(() =>
			this.getModel().findMany(
				options
					? {
							...(options.where !== undefined && { where: options.where }),
							...(options.orderBy !== undefined && { orderBy: options.orderBy }),
							...(options.take !== undefined && { take: options.take }),
							...(options.skip !== undefined && { skip: options.skip }),
						}
					: undefined,
			),
		);
		return records.map((record) => this.mapToDomain(record));
	}

	async create(data: TCreateInput): Promise<TDomain> {
		const persistenceData = this.toCreatePersistence(data);
		const record = await this.executePrisma(() =>
			this.getModel().create({ data: persistenceData }),
		);
		return this.mapToDomain(record);
	}

	async update(id: string, data: TUpdateInput): Promise<TDomain> {
		const persistenceData = this.toUpdatePersistence(data);
		const record = await this.executePrisma(() =>
			this.getModel().update({ where: { id }, data: persistenceData }),
		);
		return this.mapToDomain(record);
	}

	async delete(id: string): Promise<boolean> {
		await this.executePrisma(() => this.getModel().delete({ where: { id } }));
		return true;
	}

	async exists(where: TWhereInput): Promise<boolean> {
		const total = await this.executePrisma(() => this.getModel().count({ where }));
		return total > 0;
	}

	protected async executePrisma<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error: unknown) {
			throw this.translatePrismaError(error);
		}
	}

	protected translatePrismaError(error: unknown): unknown {
		if (!isPrismaKnownRequestError(error)) {
			return error;
		}

		switch (error.code) {
			case 'P2002':
				return new ConflictError(
					'Resource already exists (unique constraint violation)',
					error.meta,
				);
			case 'P2025':
				return new AppError(
					'Requested record was not found',
					HTTP_STATUS.NOT_FOUND,
					ERROR_CODES.NOT_FOUND,
					error.meta,
				);
			case 'P2003':
				return new BadRequestError(
					'Invalid reference (foreign key constraint violation)',
					error.meta,
				);
			default:
				return new PersistenceError(error.message, { cause: error });
		}
	}
}
