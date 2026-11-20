import type {
	AdminSubscriberDetailsOutputDTO,
	GetAdminSubscriberDetailsInputDTO,
} from '@application/dtos/admin-subscribers/get-admin-subscriber-details.dto.ts';

export interface IGetAdminSubscriberDetailsUseCase {
	execute(input: GetAdminSubscriberDetailsInputDTO): Promise<AdminSubscriberDetailsOutputDTO>;
}
