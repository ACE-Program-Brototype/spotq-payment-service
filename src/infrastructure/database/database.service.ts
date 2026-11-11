import type { IHealthCheckable } from '@domain/index.ts';
import type { PrismaClient } from '@prisma/client';
import { injectable, unmanaged } from 'inversify';
import { prisma } from './prisma.ts';

@injectable()
export class DatabaseService implements IHealthCheckable {
	private readonly client: PrismaClient;

	constructor(@unmanaged() client: PrismaClient = prisma) {
		this.client = client;
	}

	async connect(): Promise<void> {
		await this.client.$connect();
	}

	async disconnect(): Promise<void> {
		await this.client.$disconnect();
	}

	async isHealthy(): Promise<boolean> {
		try {
			await this.client.$queryRaw`SELECT 1`;
			return true;
		} catch {
			return false;
		}
	}
}
