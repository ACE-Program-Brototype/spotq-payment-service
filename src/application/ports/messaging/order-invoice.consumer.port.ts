export interface IOrderInvoiceConsumer {
	start(): Promise<void>;
	stop(): Promise<void>;
}
