import type {
	GetSubscriptionBillingHistoryQueryDTO,
	SubscriptionBillingHistoryResponseDTO,
} from '@application/dtos/subscriptions/subscription-billing-history.dto.ts';
import { SubscriptionBillingHistoryMapper } from '@application/mappers/subscriptions/subscription-billing-history.mapper.ts';
import type { IStorageService } from '@application/ports/services/storage.service.port.ts';
import type { IGetSubscriptionBillingHistoryUseCase } from '@application/ports/use-cases/subscriptions/get-subscription-billing-history.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { ITransactionQueryRepository } from '@domain/repositories/transaction-query.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import {
	INVOICE_URL_EXPIRATION_SECONDS,
	SUBSCRIPTION_BILLING_HISTORY_PAGINATION,
} from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetSubscriptionBillingHistoryUseCase implements IGetSubscriptionBillingHistoryUseCase {
	constructor(
		@inject(TYPES.Repositories.TransactionQueryRepository)
		private readonly transactionQueryRepository: ITransactionQueryRepository,
		@inject(TYPES.Services.StorageService)
		private readonly storageService: IStorageService,
	) {}

	async execute(
		dto: GetSubscriptionBillingHistoryQueryDTO,
	): Promise<SubscriptionBillingHistoryResponseDTO> {
		const page =
			dto.page && dto.page > 0 ? dto.page : SUBSCRIPTION_BILLING_HISTORY_PAGINATION.DEFAULT_PAGE;
		const limit =
			dto.limit && dto.limit > 0
				? Math.min(dto.limit, SUBSCRIPTION_BILLING_HISTORY_PAGINATION.MAX_LIMIT)
				: SUBSCRIPTION_BILLING_HISTORY_PAGINATION.DEFAULT_LIMIT;

		const { records, totalRecords } =
			await this.transactionQueryRepository.findSubscriptionBillingTransactions({
				restaurantId: dto.restaurantId,
				page,
				limit,
				status: dto.status,
			});

		const transactions = await Promise.all(
			records.map(async (record) => {
				let invoiceUrl: string | null = null;

				if (record.invoice?.invoicePdfKey) {
					try {
						const result = await this.storageService.generatePresignedDownloadUrl({
							key: record.invoice.invoicePdfKey,
							expiresInSeconds: INVOICE_URL_EXPIRATION_SECONDS,
						});
						invoiceUrl = result.downloadUrl;
					} catch (error: unknown) {
						logger.warn(
							{
								err: error,
								invoiceNumber: record.invoice.invoiceNumber,
								key: record.invoice.invoicePdfKey,
							},
							'Failed to generate invoice presigned download URL',
						);
						invoiceUrl = null;
					}
				}

				return SubscriptionBillingHistoryMapper.toTransactionItemDTO(record, invoiceUrl);
			}),
		);

		return SubscriptionBillingHistoryMapper.toResponseDTO(transactions, {
			currentPage: page,
			pageSize: limit,
			totalRecords,
		});
	}
}
