import type { BillingInvoice } from '@domain/entities/billing-invoice.entity.ts';
import type {
	CreateBillingInvoiceInput,
	IBillingInvoiceRepository,
	UpdateBillingInvoiceInput,
} from '@domain/repositories/billing-invoice.repository.interface.ts';
import { BillingInvoicePersistenceMapper } from '@infrastructure/mappers/billing-invoice.persistence-mapper.ts';
import type { Prisma, BillingInvoice as PrismaBillingInvoice } from '@prisma/client';
import { injectable } from 'inversify';
import { PrismaBaseRepository } from './prisma-base.repository.ts';

@injectable()
export class PrismaBillingInvoiceRepository
	extends PrismaBaseRepository<
		BillingInvoice,
		PrismaBillingInvoice,
		Prisma.BillingInvoiceWhereInput,
		CreateBillingInvoiceInput,
		UpdateBillingInvoiceInput,
		Prisma.BillingInvoiceUncheckedCreateInput,
		Prisma.BillingInvoiceUncheckedUpdateInput
	>
	implements IBillingInvoiceRepository
{
	protected override getModel() {
		return this.prisma.billingInvoice;
	}

	protected override mapToDomain(record: PrismaBillingInvoice): BillingInvoice {
		return BillingInvoicePersistenceMapper.toDomain(record);
	}

	protected override toCreatePersistence(
		data: CreateBillingInvoiceInput,
	): Prisma.BillingInvoiceUncheckedCreateInput {
		return BillingInvoicePersistenceMapper.toCreatePersistence(data);
	}

	protected override toUpdatePersistence(
		data: UpdateBillingInvoiceInput,
	): Prisma.BillingInvoiceUncheckedUpdateInput {
		return BillingInvoicePersistenceMapper.toUpdatePersistence(data);
	}

	async findByInvoiceNumber(invoiceNumber: string): Promise<BillingInvoice | null> {
		return this.executePrisma(async () => {
			const record = await this.prisma.billingInvoice.findUnique({
				where: { invoiceNumber },
			});
			return record ? this.mapToDomain(record) : null;
		});
	}

	async findByPaymentTransactionId(paymentTransactionId: string): Promise<BillingInvoice | null> {
		return this.executePrisma(async () => {
			const record = await this.prisma.billingInvoice.findFirst({
				where: { paymentTransactionId },
			});
			return record ? this.mapToDomain(record) : null;
		});
	}

	async findByRestaurantId(restaurantId: string): Promise<BillingInvoice[]> {
		return this.find({
			where: { restaurantId },
			orderBy: { createdAt: 'desc' },
		});
	}

	async updatePdfKey(
		id: string,
		invoicePdfKey: string,
		pdfGeneratedAt: Date,
	): Promise<BillingInvoice | null> {
		return this.update(id, {
			invoicePdfKey,
			pdfGeneratedAt,
		});
	}
}
