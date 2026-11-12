import type {
	GetCustomerInvoiceInputDTO,
	GetCustomerInvoiceOutputDTO,
} from '@application/dtos/customer-payment/get-customer-invoice.dto.ts';
import type { IStorageService } from '@application/ports/services/storage.service.port.ts';
import type { IGetCustomerInvoiceUseCase } from '@application/ports/use-cases/customer-payment/get-customer-invoice.use-case.port.ts';
import { TYPES } from '@di/types.ts';
import {
	CustomerUnauthorizedError,
	InvoiceNotFoundError,
	InvoicePdfNotReadyError,
	InvoiceUnavailableError,
	InvoiceVoidedError,
} from '@domain/errors/payment.errors.ts';
import { TransactionNotFoundError } from '@domain/errors/transaction.errors.ts';
import type { IBillingInvoiceRepository } from '@domain/repositories/billing-invoice.repository.interface.ts';
import type { IPaymentTransactionRepository } from '@domain/repositories/payment-transaction.repository.interface.ts';
import {
	INVOICE_PDF_FILE_EXTENSION,
	INVOICE_PDF_FILE_PREFIX,
	INVOICE_STATUS,
	INVOICE_URL_EXPIRATION_SECONDS,
	PAYMENT_STATUS,
} from '@shared/constants/index.ts';
import { inject, injectable } from 'inversify';

@injectable()
export class GetCustomerInvoiceUseCase implements IGetCustomerInvoiceUseCase {
	constructor(
		@inject(TYPES.Repositories.PaymentTransactionRepository)
		private readonly paymentTransactionRepository: IPaymentTransactionRepository,
		@inject(TYPES.Repositories.BillingInvoiceRepository)
		private readonly billingInvoiceRepository: IBillingInvoiceRepository,
		@inject(TYPES.Services.StorageService)
		private readonly storageService: IStorageService,
	) {}

	async execute(input: GetCustomerInvoiceInputDTO): Promise<GetCustomerInvoiceOutputDTO> {
		if (!input.customerId?.trim()) {
			throw new CustomerUnauthorizedError();
		}

		const tx = await this.paymentTransactionRepository.findById(input.transactionId);
		if (!tx) {
			throw new TransactionNotFoundError();
		}

		tx.assertOwnership(input.customerId);

		if (tx.status === PAYMENT_STATUS.CREATED || tx.status === PAYMENT_STATUS.FAILED) {
			throw new InvoiceUnavailableError();
		}

		const invoice = await this.billingInvoiceRepository.findByPaymentTransactionId(tx.id);

		if (tx.status === PAYMENT_STATUS.REFUNDED || invoice?.status === INVOICE_STATUS.VOID) {
			throw new InvoiceVoidedError();
		}

		if (!invoice) {
			throw new InvoiceNotFoundError();
		}

		if (!invoice.invoicePdfKey) {
			throw new InvoicePdfNotReadyError();
		}

		const { downloadUrl, expiresInSeconds } =
			await this.storageService.generatePresignedDownloadUrl({
				key: invoice.invoicePdfKey,
				expiresInSeconds: INVOICE_URL_EXPIRATION_SECONDS,
				fileName: `${INVOICE_PDF_FILE_PREFIX}${invoice.invoiceNumber}${INVOICE_PDF_FILE_EXTENSION}`,
			});

		return {
			downloadUrl,
			expiresInSeconds,
			invoiceNumber: invoice.invoiceNumber,
		};
	}
}
