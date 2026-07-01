import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchant extends Document {
  userId: string;
  canonicalName: string; 
  aliases: string[]; // e.g., ["Zomato Gold", "Zomato Dining"]
  categoryId: mongoose.Types.ObjectId;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    userId: { type: String, required: true, index: true },
    canonicalName: { type: String, required: true, trim: true },
    aliases: [{ type: String, trim: true }],
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    usageCount: { type: Number, default: 1 },
    lastUsedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

MerchantSchema.index({ userId: 1, canonicalName: 1 });

export const Merchant = mongoose.models.Merchant || mongoose.model<IMerchant>('Merchant', MerchantSchema);
