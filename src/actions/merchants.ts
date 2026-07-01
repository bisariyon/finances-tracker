'use server';

import { auth } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongoose';
import { Merchant } from '@/models/Merchant';
import { serializeDocument } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

export async function getMerchants() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const merchants = await Merchant.find({ userId })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .populate('categoryId', 'name color icon')
    .lean();
  return serializeDocument(merchants);
}

export async function searchMerchants(query: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  if (!query || query.length < 1) return [];

  const regex = new RegExp(query, 'i');
  const merchants = await Merchant.find({
    userId,
    $or: [{ canonicalName: regex }, { aliases: regex }],
  })
    .sort({ usageCount: -1, lastUsedAt: -1 })
    .limit(8)
    .populate('categoryId', 'name color icon _id')
    .lean();
  return serializeDocument(merchants);
}

export async function createMerchant(data: {
  canonicalName: string;
  aliases: string[];
  categoryId: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const merchant = await Merchant.create({ ...data, userId });
  revalidatePath('/categories');
  return serializeDocument(merchant.toObject());
}

export async function updateMerchant(
  id: string,
  data: { canonicalName: string; aliases: string[]; categoryId: string }
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  const merchant = await Merchant.findOneAndUpdate({ _id: id, userId }, data, { new: true }).lean();
  revalidatePath('/categories');
  return serializeDocument(merchant);
}

export async function incrementMerchantUsage(merchantId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  await Merchant.findOneAndUpdate(
    { _id: merchantId, userId },
    { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
  );
}

export async function deleteMerchant(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await connectToDatabase();
  await Merchant.findOneAndDelete({ _id: id, userId });
  revalidatePath('/categories');
  return { success: true };
}
