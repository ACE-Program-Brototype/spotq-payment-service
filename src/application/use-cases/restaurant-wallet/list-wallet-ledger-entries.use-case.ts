import type {
	ListWalletLedgerEntriesInputDTO,
	ListWalletLedgerEntriesOutputDTO,
} from '@application/dtos/restaurant-wallet/list-wallet-ledger-entries.dto.ts';
import { ListWalletLedgerEntriesMapper } from '@application/mappers/restaurant-wallet/list-wallet-ledger-entries.mapper.ts';
import type { IListWalletLedgerEntriesUseCase } from '@application/ports/use-cases/restaurant-wallet/list-wallet-ledger-entries.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { IRestaurantWalletRepository } from '@domain/repositories/restaurant-wallet.repository.interface.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class ListWalletLedgerEntriesUseCase implements IListWalletLedgerEntriesUseCase {
	constructor(
		@inject(TYPES.Repositories.RestaurantWalletRepository)
		private readonly walletRepository: IRestaurantWalletRepository,
	) {}

	async execute(input: ListWalletLedgerEntriesInputDTO): Promise<ListWalletLedgerEntriesOutputDTO> {
		const result = await this.walletRepository.findLedgerEntriesPaginated(input);
		return ListWalletLedgerEntriesMapper.toDto(result, input.page, input.limit);
	}
}
