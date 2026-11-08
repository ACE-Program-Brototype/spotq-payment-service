import fs from 'node:fs/promises';
import path from 'node:path';
import type { OrderInvoiceDataDTO } from '../src/application/dtos/order-payment-invoice-event.dto.ts';
import { renderOrderInvoiceHtml } from '../src/infrastructure/pdf/templates/order-invoice.template.ts';
import { amountToIndianWords } from '../src/shared/utils/currency.util.ts';

const sampleOrderData: OrderInvoiceDataDTO = {
	orderId: '25679960-2f90-44f0-bb04-59e10a2a1fad',
	orderNumber: 'ORD-MW2IVUYM-40CDEC',
	paymentId: '60cc4d22-8e6b-46d9-a427-8175ffa2e1b4',
	restaurantId: '7837b94b-d0c4-4e94-9eb9-81a1d4116701',
	restaurantName: 'hai restaurant',
	customerId: '911588f8-9ae1-439f-aeeb-c31b67c2b8a8',
	customerName: 'Allu Ameen',
	customerPhone: '+91 823727822',
	orderingMode: 'SELF_ORDER',
	tableNumber: null,
	queueEntryId: null,
	paymentMode: 'ONLINE',
	paymentStatus: 'PAID',
	orderStatus: 'CONFIRMED',
	currency: 'INR',
	specialInstructions: null,
	financials: {
		subtotal: 36,
		taxAmount: 1.8,
		platformFee: 0,
		discountAmount: 0,
		grandTotal: 37.8,
		amountPaise: 3780,
	},
	items: [
		{
			menuItemId: '393400c7-2fef-44a8-8b30-2cb2b0d78154',
			itemName: 'Biriyani',
			variantId: null,
			variantName: null,
			quantity: 3,
			unitPrice: 12,
			totalPrice: 36,
			specialInstructions: null,
			addons: [],
		},
	],
	createdAt: '2026-11-04T19:41:36.773Z',
	confirmedAt: '2026-11-04T19:44:10.429Z',
};

async function main() {
	let gotenbergUrl = process.env.GOTENBERG_URL || 'http://localhost:3008';
	// If executed from host machine outside Docker, replace internal docker hostname "gotenberg" with "localhost"
	if (gotenbergUrl.includes('//gotenberg:')) {
		gotenbergUrl = gotenbergUrl.replace('//gotenberg:', '//localhost:');
	}
	console.log(`\n1. Rendering HTML template for order: ${sampleOrderData.orderNumber}...`);
	const html = renderOrderInvoiceHtml(sampleOrderData);

	console.log(
		`   Amount in Words: "${amountToIndianWords(sampleOrderData.financials.grandTotal)}"`,
	);
	console.log(`2. Connecting to Gotenberg at ${gotenbergUrl}...`);

	const endpoint = `${gotenbergUrl.replace(/\/+$/, '')}/forms/chromium/convert/html`;
	const formData = new FormData();
	formData.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
	formData.append('marginTop', '0.4');
	formData.append('marginBottom', '0.4');
	formData.append('marginLeft', '0.4');
	formData.append('marginRight', '0.4');
	formData.append('printBackground', 'true');

	const response = await fetch(endpoint, {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Gotenberg returned error ${response.status}: ${errText}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	const pdfBuffer = Buffer.from(arrayBuffer);

	const outputPath = path.resolve(process.cwd(), 'sample-invoice.pdf');
	await fs.writeFile(outputPath, pdfBuffer);

	console.log(`\n SUCCESS! PDF generated (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
	console.log(` File saved at: ${outputPath}`);
	console.log(`You can open this file in your browser to inspect the design!\n`);
}

main().catch((err) => {
	console.error('\n Failed to generate PDF:', err.message);
	console.error('Make sure Gotenberg is running (e.g. docker compose up gotenberg)\n');
	process.exit(1);
});
