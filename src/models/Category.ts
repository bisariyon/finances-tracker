import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  userId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  isSystem: boolean; // For default categories
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    color: { type: String, default: '#000000' },
    icon: { type: String, default: 'Circle' },
    isSystem: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
