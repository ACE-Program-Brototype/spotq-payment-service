import type {
	ListWalletLedgerEntriesInputDTO,
	ListWalletLedgerEntriesOutputDTO,
} from '@application/dtos/restaurant-wallet/list-wallet-ledger-entries.dto.ts';

export interface IListWalletLedgerEntriesUseCase {
	execute(input: ListWalletLedgerEntriesInputDTO): Promise<ListWalletLedgerEntriesOutputDTO>;
}
