export interface IBaseRepository<T, TCreateInput = unknown> {
	findById(id: string): Promise<T | null>;
	create(data: TCreateInput): Promise<T>;
}
