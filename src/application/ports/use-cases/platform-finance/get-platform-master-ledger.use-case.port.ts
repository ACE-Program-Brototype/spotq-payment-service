import type {
	GetPlatformMasterLedgerInputDTO,
	GetPlatformMasterLedgerOutputDTO,
} from '@application/dtos/platform-finance/get-platform-master-ledger.dto';

export interface IGetPlatformMasterLedgerUseCase {
	execute(input: GetPlatformMasterLedgerInputDTO): Promise<GetPlatformMasterLedgerOutputDTO>;
}
