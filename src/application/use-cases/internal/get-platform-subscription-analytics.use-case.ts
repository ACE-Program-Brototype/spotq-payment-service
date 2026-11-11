import type {
	GetPlatformSubscriptionAnalyticsInputDTO,
	PlatformSubscriptionAnalyticsResponseDTO,
} from '@application/dtos/subscription-analytics/platform-subscription-analytics.dto.ts';
import { PlatformSubscriptionAnalyticsMapper } from '@application/mappers/subscription-analytics/platform-subscription-analytics.mapper.ts';
import type { IGetPlatformSubscriptionAnalyticsUseCase } from '@application/ports/use-cases/internal/get-platform-subscription-analytics.use-case.port.ts';
import { resolveSubscriptionDateRange } from '@application/utils/subscription-date-range.util.ts';
import { TYPES } from '@di/types.ts';
import type { ISubscriptionAnalyticsRepository } from '@domain/repositories/subscription-analytics.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetPlatformSubscriptionAnalyticsUseCase
	implements IGetPlatformSubscriptionAnalyticsUseCase
{
	constructor(
		@inject(TYPES.Repositories.SubscriptionAnalyticsRepository)
		private readonly analyticsRepository: ISubscriptionAnalyticsRepository,
	) {}

	async execute(
		input: GetPlatformSubscriptionAnalyticsInputDTO,
	): Promise<PlatformSubscriptionAnalyticsResponseDTO> {
		const resolvedRange = resolveSubscriptionDateRange({
			period: input.period,
			day: input.day,
			month: input.month,
			year: input.year,
		});

		const repoResult = await this.analyticsRepository.getPlatformSubscriptionAnalytics({
			periodStartDate: resolvedRange.periodStartDate,
			nextPeriodStart: resolvedRange.nextPeriodStart,
			prevStartDate: resolvedRange.prevStartDate,
			billingCycle: input.billingCycle,
			buckets: resolvedRange.buckets,
		});

		return PlatformSubscriptionAnalyticsMapper.toDTO(repoResult, resolvedRange, input.billingCycle);
	}
}
