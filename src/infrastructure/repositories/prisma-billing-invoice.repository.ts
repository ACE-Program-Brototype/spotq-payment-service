import { BillingInvoice } from '@domain/entities/billing-invoice.entity.ts';
import type {
	CreateBillingInvoiceInput,
	IBillingInvoiceRepository,
	UpdateBillingInvoiceInput,
} from '@domain/repositories/billing-invoice.repository.interface.ts';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaBillingInvoiceRepository
	extends PrismaBaseRepository
	implements IBillingInvoiceRepository
{
	async findById(id: string): Promise<BillingInvoice | null> {
		const record = await this.prisma.billingInvoice.findUnique({
			where: { id },
		});
		return record ? this.mapToEntity(record) : null;
	}

	async findByInvoiceNumber(invoiceNumber: string): Promise<BillingInvoice | null> {
		const record = await this.prisma.billingInvoice.findUnique({
			where: { invoiceNumber },
		});
		return record ? this.mapToEntity(record) : null;
	}

	async findByPaymentTransactionId(paymentTransactionId: string): Promise<BillingInvoice | null> {
		const record = await this.prisma.billingInvoice.findFirst({
			where: { paymentTransactionId },
		});
		return record ? this.mapToEntity(record) : null;
	}

	async findByRestaurantId(restaurantId: string): Promise<BillingInvoice[]> {
		const records = await this.prisma.billingInvoice.findMany({
			where: { restaurantId },
			orderBy: { createdAt: 'desc' },
		});
		return records.map((r) => this.mapToEntity(r));
	}

	async create(data: CreateBillingInvoiceInput): Promise<BillingInvoice> {
		const record = await this.prisma.billingInvoice.create({
			data: {
				restaurantId: data.restaurantId,
				subscriptionId: data.subscriptionId,
				paymentTransactionId: data.paymentTransactionId,
				invoiceNumber: data.invoiceNumber,
				amountPaise: data.amountPaise,
				currency: data.currency ?? 'INR',
				status: data.status ?? 'DRAFT',
				invoicePdfKey: data.invoicePdfKey,
				pdfGeneratedAt: data.pdfGeneratedAt,
			},
		});
		return this.mapToEntity(record);
	}

	async update(id: string, data: UpdateBillingInvoiceInput): Promise<BillingInvoice> {
		const record = await this.prisma.billingInvoice.update({
			where: { id },
			data: {
				subscriptionId: data.subscriptionId,
				paymentTransactionId: data.paymentTransactionId,
				status: data.status,
				paidAt: data.paidAt,
				invoicePdfKey: data.invoicePdfKey,
				pdfGeneratedAt: data.pdfGeneratedAt,
			},
		});
		return this.mapToEntity(record);
	}

	async updatePdfKey(
		id: string,
		invoicePdfKey: string,
		pdfGeneratedAt: Date,
	): Promise<BillingInvoice | null> {
		const record = await this.prisma.billingInvoice.update({
			where: { id },
			data: {
				invoicePdfKey,
				pdfGeneratedAt,
			},
		});
		return record ? this.mapToEntity(record) : null;
	}

	async delete(id: string): Promise<boolean> {
		await this.prisma.billingInvoice.delete({
			where: { id },
		});
		return true;
	}

	private mapToEntity(record: {
		id: string;
		restaurantId: string;
		subscriptionId: string | null;
		paymentTransactionId: string | null;
		invoiceNumber: string;
		amountPaise: number;
		currency: string;
		status: string;
		invoicePdfKey?: string | null;
		pdfGeneratedAt?: Date | null;
		createdAt: Date;
		updatedAt: Date;
		paidAt: Date | null;
	}): BillingInvoice {
		return new BillingInvoice({
			id: record.id,
			restaurantId: record.restaurantId,
			subscriptionId: record.subscriptionId,
			paymentTransactionId: record.paymentTransactionId,
			invoiceNumber: record.invoiceNumber,
			amountPaise: record.amountPaise,
			currency: record.currency,
			status: record.status as 'DRAFT' | 'PAID' | 'VOID',
			invoicePdfKey: record.invoicePdfKey,
			pdfGeneratedAt: record.pdfGeneratedAt,
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
			paidAt: record.paidAt,
		});
	}
}
