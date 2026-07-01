import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer' | 'investment' | 'refund' | 'loan' | 'repayment';
  date: Date;
  accountId: mongoose.Types.ObjectId;
  toAccountId?: mongoose.Types.ObjectId; // For transfers
  categoryId?: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId; // Reference to canonical Merchant
  merchantName?: string; // The raw string the user typed
  tags: string[];
  notes?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['expense', 'income', 'transfer', 'investment', 'refund', 'loan', 'repayment'],
      required: true 
    },
    date: { type: Date, required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    toAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant' },
    merchantName: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    notes: { type: String },
    receiptUrl: { type: String }
  },
  { timestamps: true }
);

export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
