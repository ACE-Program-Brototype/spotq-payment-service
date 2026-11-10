import type { OrderInvoiceDataDTO } from '@application/dtos/order-payment-invoice-event.dto.ts';
import { amountToIndianWords, formatINR } from '@shared/utils/currency.util.ts';

function formatDate(isoString: string): string {
	try {
		const date = new Date(isoString);
		return date.toLocaleString('en-IN', {
			timeZone: 'Asia/Kolkata',
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true,
		});
	} catch {
		return isoString;
	}
}

export function renderOrderInvoiceHtml(order: OrderInvoiceDataDTO): string {
	const formattedDate = formatDate(order.confirmedAt || order.createdAt);
	const grandTotalWords = amountToIndianWords(order.financials.grandTotal);

	const itemsHtml = order.items
		.map((item, index) => {
			const variantText = item.variantName ? `<span class="badge">${item.variantName}</span>` : '';
			const addonsText =
				item.addons && item.addons.length > 0
					? `<div class="addons">${item.addons.map((a) => `+ ${a.addonName} (${formatINR(a.price)})`).join(', ')}</div>`
					: '';

			return `
        <tr>
          <td class="col-num">${index + 1}</td>
          <td class="col-item">
            <div class="item-name">${escapeHtml(item.itemName)} ${variantText}</div>
            ${addonsText}
          </td>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-price">${formatINR(item.unitPrice)}</td>
          <td class="col-total">${formatINR(item.totalPrice)}</td>
        </tr>
      `;
		})
		.join('');

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${escapeHtml(order.orderNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      color: #1f2937;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
      padding: 10px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .brand h1 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand p {
      color: #6b7280;
      font-size: 12px;
      margin-top: 2px;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      font-size: 18px;
      font-weight: 700;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-title .order-no {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-top: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }
    .card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .card-label {
      color: #6b7280;
    }
    .card-val {
      font-weight: 600;
      color: #111827;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    th {
      background: #f3f4f6;
      color: #374151;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      padding: 10px 12px;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    .col-num { width: 5%; color: #9ca3af; text-align: center; }
    .col-item { width: 50%; }
    .col-qty { width: 10%; text-align: center; font-weight: 600; }
    .col-price { width: 15%; text-align: right; }
    .col-total { width: 20%; text-align: right; font-weight: 600; }
    .item-name {
      font-weight: 600;
      color: #111827;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      background: #e0e7ff;
      color: #4338ca;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 6px;
    }
    .addons {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 25px;
    }
    .totals-box {
      width: 45%;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .total-row.grand {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      margin-top: 8px;
    }
    .words-box {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 12px 14px;
      border-radius: 4px;
      margin-bottom: 30px;
    }
    .words-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .words-val {
      font-weight: 600;
      color: #0f172a;
      font-style: italic;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>SpotQ</h1>
      <p>Order Receipt & Payment Invoice</p>
    </div>
    <div class="invoice-title">
      <h2>Invoice</h2>
      <div class="order-no">${escapeHtml(order.orderNumber)}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="card">
      <div class="card-title">Order Information</div>
      <div class="card-row">
        <span class="card-label">Restaurant:</span>
        <span class="card-val">${escapeHtml(order.restaurantName || 'SpotQ Partner')}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Date & Time:</span>
        <span class="card-val">${formattedDate}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Order Type:</span>
        <span class="card-val">${escapeHtml(order.orderingMode || 'DINE_IN')}${order.tableNumber ? ` (Table ${order.tableNumber})` : ''}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Order Status:</span>
        <span class="card-val">${escapeHtml(order.orderStatus)}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Customer & Payment</div>
      <div class="card-row">
        <span class="card-label">Customer Name:</span>
        <span class="card-val">${escapeHtml(order.customerName || 'Guest')}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Phone:</span>
        <span class="card-val">${escapeHtml(order.customerPhone || 'N/A')}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Payment Mode:</span>
        <span class="card-val">${escapeHtml(order.paymentMode)}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Payment Status:</span>
        <span class="card-val" style="color: #059669;">${escapeHtml(order.paymentStatus)}</span>
      </div>
      ${
				order.paymentId
					? `
      <div class="card-row">
        <span class="card-label">Payment Ref:</span>
        <span class="card-val" style="font-family: monospace; font-size: 11px;">${escapeHtml(order.paymentId.slice(0, 18))}...</span>
      </div>`
					: ''
			}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-item">Item & Details</th>
        <th class="col-qty">Qty</th>
        <th class="col-price">Unit Price</th>
        <th class="col-total">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals-area">
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${formatINR(order.financials.subtotal)}</span>
      </div>
      ${
				order.financials.taxAmount > 0
					? `
      <div class="total-row">
        <span>Taxes & Charges</span>
        <span>${formatINR(order.financials.taxAmount)}</span>
      </div>`
					: ''
			}
      ${
				order.financials.platformFee > 0
					? `
      <div class="total-row">
        <span>Platform Fee</span>
        <span>${formatINR(order.financials.platformFee)}</span>
      </div>`
					: ''
			}
      ${
				order.financials.discountAmount > 0
					? `
      <div class="total-row" style="color: #059669;">
        <span>Discount</span>
        <span>-${formatINR(order.financials.discountAmount)}</span>
      </div>`
					: ''
			}
      <div class="total-row grand">
        <span>Grand Total</span>
        <span>${formatINR(order.financials.grandTotal)}</span>
      </div>
    </div>
  </div>

  <div class="words-box">
    <div class="words-label">Amount in Words</div>
    <div class="words-val">${grandTotalWords}</div>
  </div>

  <div class="footer">
    <p>This is a computer-generated order receipt and payment invoice issued via SpotQ.</p>
    <p>Thank you for your order!</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
