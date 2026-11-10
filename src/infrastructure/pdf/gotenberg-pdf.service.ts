import type { OrderInvoiceDataDTO } from '@application/dtos/order-payment-invoice-event.dto.ts';
import type { IInvoicePdfService } from '@application/ports/services/invoice-pdf.service.port.ts';
import { config } from '@config/index.ts';
import { PdfGenerationError } from '@infrastructure/errors/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { MESSAGES, TRAILING_SLASH_REGEX } from '@shared/constants/index.ts';
import { injectable } from 'inversify';
import { renderOrderInvoiceHtml } from './templates/order-invoice.template.ts';

@injectable()
export class GotenbergPdfService implements IInvoicePdfService {
	private readonly gotenbergUrl: string;

	constructor() {
		this.gotenbergUrl = config.gotenberg.url.replace(TRAILING_SLASH_REGEX, '');
	}

	async generateInvoicePdf(orderData: OrderInvoiceDataDTO): Promise<Buffer> {
		const html = renderOrderInvoiceHtml(orderData);
		return this.convertHtmlToPdf(html);
	}

	private async convertHtmlToPdf(html: string): Promise<Buffer> {
		const endpoint = `${this.gotenbergUrl}/forms/chromium/convert/html`;

		const formData = new FormData();
		formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
		formData.append('marginTop', '0.4');
		formData.append('marginBottom', '0.4');
		formData.append('marginLeft', '0.4');
		formData.append('marginRight', '0.4');
		formData.append('printBackground', 'true');

		logger.debug({ endpoint }, 'Sending HTML conversion request to Gotenberg');

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => '');
				logger.error(
					{ status: response.status, statusText: response.statusText, errorText },
					MESSAGES.GOTENBERG_CONVERSION_FAILED,
				);
				throw new PdfGenerationError(
					`${MESSAGES.GOTENBERG_GENERATION_FAILED} with status ${response.status}: ${errorText || response.statusText}`,
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			return Buffer.from(arrayBuffer);
		} catch (error) {
			logger.error({ err: error, endpoint }, MESSAGES.GOTENBERG_CONNECTION_FAILED);
			throw error;
		}
	}
}
