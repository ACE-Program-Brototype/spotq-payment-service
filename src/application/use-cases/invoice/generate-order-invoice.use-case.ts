import type { OrderInvoiceDataDTO } from '@application/dtos/order-payment-invoice-event.dto.ts';
import type { IInvoicePdfService } from '@application/ports/services/invoice-pdf.service.port.ts';
import type { IStorageService } from '@application/ports/services/storage.service.port.ts';
import type { IGenerateOrderInvoiceUseCase } from '@application/ports/use-cases/generate-order-invoice.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import type { BillingInvoice } from '@domain/entities/billing-invoice.entity.ts';
import type { IBillingInvoiceRepository } from '@domain/repositories/billing-invoice.repository.interface.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GenerateOrderInvoiceUseCase implements IGenerateOrderInvoiceUseCase {
	constructor(
		@inject(TYPES.Repositories.BillingInvoiceRepository)
		private readonly billingInvoiceRepository: IBillingInvoiceRepository,
		@inject(TYPES.Services.InvoicePdfService)
		private readonly invoicePdfService: IInvoicePdfService,
		@inject(TYPES.Services.StorageService)
		private readonly storageService: IStorageService,
	) {}

	async execute(orderData: OrderInvoiceDataDTO): Promise<BillingInvoice> {
		logger.info(
			{
				orderId: orderData.orderId,
				orderNumber: orderData.orderNumber,
				paymentId: orderData.paymentId,
			},
			'Processing order invoice generation',
		);

		// Check idempotency: check if invoice already exists for this payment transaction
		let invoice: BillingInvoice | null = null;
		if (orderData.paymentId) {
			invoice = await this.billingInvoiceRepository.findByPaymentTransactionId(orderData.paymentId);
		}

		// If invoice already exists and PDF is already generated, return early (idempotent)
		if (invoice?.invoicePdfKey) {
			logger.info(
				{
					invoiceId: invoice.id,
					invoiceNumber: invoice.invoiceNumber,
					s3Key: invoice.invoicePdfKey,
				},
				'Invoice PDF already exists in S3, skipping generation',
			);
			return invoice;
		}

		// If invoice doesn't exist yet, generate invoice number and create it in DB
		if (!invoice) {
			const invoiceNumber = this.generateInvoiceNumber(orderData);
			invoice = await this.billingInvoiceRepository.create({
				restaurantId: orderData.restaurantId,
				paymentTransactionId: orderData.paymentId,
				invoiceNumber,
				amountPaise: orderData.financials.amountPaise,
				currency: orderData.currency || 'INR',
				status: 'PAID',
			});
		}

		// 1. Generate PDF via Invoice PDF Port (Gotenberg infrastructure implementation handles template rendering)
		const pdfBuffer = await this.invoicePdfService.generateInvoicePdf(orderData);

		// 2. Construct S3 storage key partitioned by orderId
		const date = new Date(orderData.confirmedAt || orderData.createdAt);
		const year = date.getUTCFullYear();
		const month = String(date.getUTCMonth() + 1).padStart(2, '0');
		const s3Key = `invoices/${orderData.orderId}/${year}/${month}/${invoice.invoiceNumber}.pdf`;

		// 3. Upload buffer to S3 / MinIO
		await this.storageService.uploadFile(s3Key, pdfBuffer, 'application/pdf');

		// 4. Update BillingInvoice in database with S3 key and timestamp
		const updated = await this.billingInvoiceRepository.updatePdfKey(invoice.id, s3Key, new Date());

		logger.info(
			{ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, s3Key },
			'Successfully generated and saved order invoice PDF to S3',
		);

		return updated || invoice;
	}

	private generateInvoiceNumber(orderData: OrderInvoiceDataDTO): string {
		const cleanOrderNo = orderData.orderNumber.replace(/^ORD-/, '').replace(/[^A-Za-z0-9]/g, '');
		const date = new Date(orderData.confirmedAt || orderData.createdAt);
		const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
		return `INV-${yyyymmdd}-${cleanOrderNo}`;
	}
}
