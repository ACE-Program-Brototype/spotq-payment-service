import type {
	GetPlatformMasterLedgerInputDTO,
	GetPlatformMasterLedgerOutputDTO,
} from '@application/dtos/platform-finance/get-platform-master-ledger.dto';
import { PlatformLedgerEntryMapper } from '@application/mappers/platform-finance/platform-ledger-entry.mapper';
import type { IGetPlatformMasterLedgerUseCase } from '@application/ports/use-cases/platform-finance/get-platform-master-ledger.use-case.port';
import { TYPES } from '@di/types';
import type { IPlatformLedgerTransactionRepository } from '@domain/repositories/platform-ledger-transaction.repository.interface';
import { inject, injectable } from 'inversify';

@injectable()
export class GetPlatformMasterLedgerUseCase implements IGetPlatformMasterLedgerUseCase {
	constructor(
		@inject(TYPES.Repositories.PlatformLedgerTransactionRepository)
		private readonly platformLedgerTransactionRepository: IPlatformLedgerTransactionRepository,
	) {}

	async execute(input: GetPlatformMasterLedgerInputDTO): Promise<GetPlatformMasterLedgerOutputDTO> {
		const result = await this.platformLedgerTransactionRepository.findManyPaginated(input);

		return {
			entries: result.entries.map(PlatformLedgerEntryMapper.toDto),
			pagination: result.pagination,
		};
	}
}
