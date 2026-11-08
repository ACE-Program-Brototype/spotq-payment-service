import {
	amountToIndianWords,
	formatINR,
	numberToIndianWords,
} from '../src/shared/utils/currency.util.ts';

describe('Currency Utility', () => {
	describe('formatINR', () => {
		it('should format numbers with Indian Rupee symbol and 2 decimals', () => {
			expect(formatINR(37.8)).toBe('₹37.80');
			expect(formatINR(0)).toBe('₹0.00');
			expect(formatINR(1250)).toBe('₹1250.00');
		});
	});

	describe('numberToIndianWords', () => {
		it('should convert single digits and teens', () => {
			expect(numberToIndianWords(0)).toBe('Zero');
			expect(numberToIndianWords(5)).toBe('Five');
			expect(numberToIndianWords(14)).toBe('Fourteen');
			expect(numberToIndianWords(19)).toBe('Nineteen');
		});

		it('should convert tens and hundreds', () => {
			expect(numberToIndianWords(25)).toBe('Twenty Five');
			expect(numberToIndianWords(100)).toBe('One Hundred');
			expect(numberToIndianWords(345)).toBe('Three Hundred Forty Five');
		});

		it('should convert thousands, lakhs, and crores', () => {
			expect(numberToIndianWords(1000)).toBe('One Thousand');
			expect(numberToIndianWords(15420)).toBe('Fifteen Thousand Four Hundred Twenty');
			expect(numberToIndianWords(100000)).toBe('One Lakh');
			expect(numberToIndianWords(2540000)).toBe('Twenty Five Lakh Forty Thousand');
			expect(numberToIndianWords(10000000)).toBe('One Crore');
		});
	});

	describe('amountToIndianWords', () => {
		it('should format amounts with Rupees, Paise and Only', () => {
			expect(amountToIndianWords(37.8)).toBe('Indian Rupees Thirty Seven and Eighty Paise Only');
			expect(amountToIndianWords(100)).toBe('Indian Rupees One Hundred Only');
			expect(amountToIndianWords(0)).toBe('Indian Rupees Zero Only');
		});
	});
});
