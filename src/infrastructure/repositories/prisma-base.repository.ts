import { prisma } from '@infrastructure/database/prisma.ts';
import type { PrismaClient } from '@prisma/client';
import { injectable } from 'inversify';

/**
 * Generic base repository class wrapping Prisma client instance.
 */
@injectable()
export abstract class PrismaBaseRepository {
	protected readonly prisma: PrismaClient = prisma;
}
