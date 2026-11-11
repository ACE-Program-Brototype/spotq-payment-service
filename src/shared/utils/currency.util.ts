const ONES = [
	'',
	'One',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
	'Eleven',
	'Twelve',
	'Thirteen',
	'Fourteen',
	'Fifteen',
	'Sixteen',
	'Seventeen',
	'Eighteen',
	'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(n: number): string {
	let str = '';
	if (n >= 100) {
		str += `${ONES[Math.floor(n / 100)]} Hundred `;
		n %= 100;
	}
	if (n >= 20) {
		str += `${TENS[Math.floor(n / 10)]} `;
		n %= 10;
	}
	if (n > 0) {
		str += `${ONES[n]} `;
	}
	return str.trim();
}

/**
 * Converts an integer number into Indian numbering system words (Crores, Lakhs, Thousands, Hundreds).
 */
export function numberToIndianWords(num: number): string {
	if (num === 0) return 'Zero';

	let integerPart = Math.floor(Math.abs(num));
	let result = '';

	// Crores (>= 1,00,00,000)
	if (integerPart >= 10000000) {
		const crores = Math.floor(integerPart / 10000000);
		result += `${convertBelowThousand(crores)} Crore `;
		integerPart %= 10000000;
	}

	// Lakhs (>= 1,00,000)
	if (integerPart >= 100000) {
		const lakhs = Math.floor(integerPart / 100000);
		result += `${convertBelowThousand(lakhs)} Lakh `;
		integerPart %= 100000;
	}

	// Thousands (>= 1,000)
	if (integerPart >= 1000) {
		const thousands = Math.floor(integerPart / 1000);
		result += `${convertBelowThousand(thousands)} Thousand `;
		integerPart %= 1000;
	}

	// Hundreds and remainder
	if (integerPart > 0) {
		result += convertBelowThousand(integerPart);
	}

	return result.trim();
}

/**
 * Formats a currency amount into standard Indian legal currency words.
 * Example: 37.80 -> "Indian Rupees Thirty-Seven and Eighty Paise Only"
 */
export function amountToIndianWords(amount: number): string {
	if (amount <= 0) {
		return 'Indian Rupees Zero Only';
	}

	const fixed = amount.toFixed(2);
	const [rupeesStr, paiseStr] = fixed.split('.');
	const rupees = Number.parseInt(rupeesStr, 10);
	const paise = Number.parseInt(paiseStr, 10);

	const rupeesWord = numberToIndianWords(rupees);
	let result = `Indian Rupees ${rupeesWord}`;

	if (paise > 0) {
		const paiseWord = numberToIndianWords(paise);
		result += ` and ${paiseWord} Paise`;
	}

	return `${result} Only`;
}

/**
 * Formats a numeric amount with the Indian Rupee symbol and two decimal places.
 * Example: 37.8 -> "₹37.80"
 */
export function formatINR(amount: number): string {
	return `₹${amount.toFixed(2)}`;
}
