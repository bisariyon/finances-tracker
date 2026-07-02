import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  userId: string;
  name: string;
  type: 'bank' | 'wallet' | 'cash' | 'credit_card' | 'meal_card' | 'investment';
  balance: number;
  color: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['bank', 'wallet', 'cash', 'credit_card', 'meal_card', 'investment'],
      required: true 
    },
    balance: { type: Number, default: 0 },
    color: { type: String, default: '#000000' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Delete cached model so schema changes take effect on hot reload
delete mongoose.models['Account'];
export const Account = mongoose.model<IAccount>('Account', AccountSchema);
