import { z } from 'zod';

export const AccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['bank', 'wallet', 'cash', 'credit_card', 'meal_card', 'investment']),
  balance: z.number(),
  color: z.string(),
});

export const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['income', 'expense']),
  color: z.string(),
  icon: z.string(),
});

export const MerchantSchema = z.object({
  canonicalName: z.string().min(1, 'Merchant name is required'),
  aliases: z.array(z.string()),
  categoryId: z.string().min(1, 'Category is required'),
});

export const TransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['expense', 'income', 'transfer', 'investment', 'refund', 'loan', 'repayment']),
  date: z.string().min(1, 'Date is required'),
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  merchantId: z.string().optional(),
  merchantName: z.string().optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  receiptUrl: z.string().url().optional().or(z.literal('')),
});

export type AccountInput = z.infer<typeof AccountSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type MerchantInput = z.infer<typeof MerchantSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
