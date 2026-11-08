import type {
	ProcessOrderRefundInput,
	ProcessOrderRefundOutput,
} from '@application/dtos/process-order-refund.dto.ts';

export interface IProcessOrderRefundUseCase {
	execute(input: ProcessOrderRefundInput): Promise<ProcessOrderRefundOutput>;
}
