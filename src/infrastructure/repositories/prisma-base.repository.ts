import { prisma } from '@infrastructure/database/prisma.ts';
import type { PrismaClient } from '@prisma/client';
import { injectable } from 'inversify';

/**
 * Generic base repository class wrapping Prisma client instance.
 * Serves as the foundation for all infrastructure Prisma repository implementations,
 * ensuring centralized Prisma client access and strict architectural layer separation.
 */
@injectable()
export abstract class PrismaBaseRepository {
	protected readonly prisma: PrismaClient = prisma;
}
