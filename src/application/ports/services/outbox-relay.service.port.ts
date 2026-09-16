export interface IOutboxRelayService {
	start(pollIntervalMs?: number): void;
	stop(): void;
	processPendingEvents(): Promise<void>;
	replayDeadLetterEvent(id: string): Promise<void>;
}
