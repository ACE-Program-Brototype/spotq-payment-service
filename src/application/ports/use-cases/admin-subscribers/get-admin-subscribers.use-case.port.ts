import type {
	ListAdminSubscribersOutputDTO,
	ListAdminSubscribersQueryDTO,
} from '@application/dtos/admin-subscribers/list-admin-subscribers.dto.ts';

export interface IGetAdminSubscribersUseCase {
	execute(query: ListAdminSubscribersQueryDTO): Promise<ListAdminSubscribersOutputDTO>;
}
