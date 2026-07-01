'use server';

import { auth } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongoose';
import { Account } from '@/models/Account';
import { Category } from '@/models/Category';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { serializeDocument } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

async function seedDefaultCategories(userId: string) {
  const existing = await Category.countDocuments({ userId });
  if (existing > 0) return;

  const defaults = DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isSystem: true }));
  await Category.insertMany(defaults);
}

export async function getAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const accounts = await Account.find({ userId }).sort({ createdAt: 1 }).lean();
  return serializeDocument(accounts);
}

export async function createAccount(data: {
  name: string;
  type: string;
  balance: number;
  color: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const account = await Account.create({ ...data, userId });
  revalidatePath('/');
  revalidatePath('/accounts');
  return serializeDocument(account.toObject());
}

export async function updateAccount(
  id: string,
  data: { name: string; type: string; color: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const account = await Account.findOneAndUpdate({ _id: id, userId }, data, { new: true }).lean();
  revalidatePath('/');
  revalidatePath('/accounts');
  return serializeDocument(account);
}

export async function deleteAccount(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  await Account.findOneAndDelete({ _id: id, userId });
  revalidatePath('/');
  revalidatePath('/accounts');
  return { success: true };
}

export async function getCategories() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  await seedDefaultCategories(userId);
  const categories = await Category.find({ userId }).sort({ name: 1 }).lean();
  return serializeDocument(categories);
}

export async function createCategory(data: {
  name: string;
  type: string;
  color: string;
  icon: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const category = await Category.create({ ...data, userId });
  revalidatePath('/categories');
  return serializeDocument(category.toObject());
}

export async function updateCategory(
  id: string,
  data: { name: string; type: string; color: string; icon: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const category = await Category.findOneAndUpdate({ _id: id, userId }, data, { new: true }).lean();
  revalidatePath('/categories');
  return serializeDocument(category);
}

export async function deleteCategory(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  await Category.findOneAndDelete({ _id: id, userId });
  revalidatePath('/categories');
  return { success: true };
}
