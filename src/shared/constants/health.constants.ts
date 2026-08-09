export enum HealthStatusEnum {
	UP = 'UP',
	DOWN = 'DOWN',
}

export const HEALTH_STATUS = {
	UP: HealthStatusEnum.UP,
	DOWN: HealthStatusEnum.DOWN,
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];
