export interface ICacheService {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlSeconds?: number): Promise<void>;
	acquireLock(key: string, ttlSeconds?: number): Promise<boolean>;
	releaseLock(key: string): Promise<void>;
}
