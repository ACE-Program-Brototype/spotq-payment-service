export interface IBaseRepository<T, TCreateInput = unknown, TUpdateInput = unknown> {
	findById(id: string): Promise<T | null>;
	create?(data: TCreateInput): Promise<T>;
	update?(id: string, data: TUpdateInput): Promise<T | null>;
	delete?(id: string): Promise<boolean>;
}
