import type { RestaurantWallet } from '@domain/entities/restaurant-wallet.entity.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { RestaurantWalletPersistenceMapper } from '@infrastructure/mappers/restaurant-wallet.persistence-mapper.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaRestaurantWalletRepository
	extends PrismaBaseRepository
	implements IRestaurantWalletRepository
{
	async findById(id: string): Promise<RestaurantWallet | null> {
		const record = await this.prisma.restaurantWallet.findUnique({ where: { id } });
		return record ? RestaurantWalletPersistenceMapper.toDomain(record) : null;
	}

	async findByRestaurantId(restaurantId: string): Promise<RestaurantWallet | null> {
		const record = await this.prisma.restaurantWallet.findUnique({ where: { restaurantId } });
		return record ? RestaurantWalletPersistenceMapper.toDomain(record) : null;
	}

	async create(wallet: RestaurantWallet): Promise<RestaurantWallet> {
		const record = await this.prisma.restaurantWallet.create({
			data: {
				id: wallet.id,
				restaurantId: wallet.restaurantId,
				balancePaise: wallet.balancePaise,
				currency: wallet.currency,
				isLocked: wallet.isLocked,
				razorpayFundAccountId: wallet.razorpayFundAccountId,
				bankName: wallet.bankName,
				bankAccountLast4: wallet.bankAccountLast4,
				createdAt: wallet.createdAt,
				updatedAt: wallet.updatedAt,
			},
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}

	async update(id: string, wallet: RestaurantWallet): Promise<RestaurantWallet> {
		const record = await this.prisma.restaurantWallet.update({
			where: { id },
			data: {
				balancePaise: wallet.balancePaise,
				currency: wallet.currency,
				isLocked: wallet.isLocked,
				razorpayFundAccountId: wallet.razorpayFundAccountId,
				bankName: wallet.bankName,
				bankAccountLast4: wallet.bankAccountLast4,
			},
		});
		return RestaurantWalletPersistenceMapper.toDomain(record);
	}
}
