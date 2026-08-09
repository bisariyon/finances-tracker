"use server";

import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import { Account } from "@/models/Account";
import { Category } from "@/models/Category";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { serializeDocument, formatCurrency } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Transaction } from "@/models/Transaction";
import mongoose from "mongoose";

async function seedDefaultCategories(userId: string) {
  // 1. Clean up any existing duplicates caused by previous race conditions
  const allUserCats = await Category.find({ userId });
  const seen = new Set<string>();
  const toDelete: any[] = [];
  for (const c of allUserCats) {
    if (seen.has(c.name)) toDelete.push(c._id);
    else seen.add(c.name);
  }

  if (toDelete.length > 0) {
    await Category.deleteMany({ _id: { $in: toDelete } });
  }

  // 2. Only seed if no unique categories exist
  const uniqueCount = allUserCats.length - toDelete.length;
  if (uniqueCount > 0) return;

  try {
    const defaults = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      userId,
      isSystem: true,
    }));
    await Category.insertMany(defaults, { ordered: false });
  } catch {
    // Ignore duplicate key errors if another parallel request already inserted them
  }
}

export async function getAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();
  const accounts = await Account.find({ userId }).sort({ isDefault: -1, createdAt: 1 }).lean();
  return serializeDocument(accounts) as any;
}

export async function createAccount(data: {
  name: string;
  type: 'bank' | 'wallet' | 'cash' | 'credit_card' | 'meal_card' | 'investment';
  balance: number;
  color: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();
  const account = await Account.create({ ...data, userId });
  revalidatePath("/");
  revalidatePath("/accounts");
  return serializeDocument(account.toObject());
}

export async function updateAccount(
  id: string,
  data: { name: string; type: string; color: string; balance?: number },
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await Account.findOne({ _id: id, userId }).session(session);
    if (!existing) throw new Error("Account not found");

    const oldBalance = existing.balance;
    const newBalance = data.balance !== undefined ? data.balance : oldBalance;

    const updated = await Account.findOneAndUpdate(
      { _id: id, userId },
      { ...data, balance: newBalance },
      { new: true, session }
    ).lean();

    if (newBalance !== oldBalance) {
      const diff = newBalance - oldBalance;
      const formattedOld = formatCurrency(oldBalance);
      const formattedNew = formatCurrency(newBalance);
      const description = `Account updated from ${formattedOld} to ${formattedNew}`;

      await Transaction.create(
        [
          {
            userId,
            amount: Math.abs(diff),
            type: diff > 0 ? "income" : "expense",
            date: new Date(),
            accountId: id,
            merchantName: "Balance Adjustment",
            notes: description,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/transactions");

    return serializeDocument(updated);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function setDefaultAccount(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();
  // strict:false ensures isDefault is written even if the cached Mongoose
  // model was compiled before this field was added to the schema
  await Account.updateMany({ userId }, { $set: { isDefault: false } }, { strict: false } as object);
  const updated = await Account.findOneAndUpdate(
    { _id: id, userId },
    { $set: { isDefault: true } },
    { new: true, strict: false } as object
  );
  if (!updated) throw new Error('Account not found');
  revalidatePath("/accounts");
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();
  await Account.findOneAndDelete({ _id: id, userId });
  revalidatePath("/");
  revalidatePath("/accounts");
  return { success: true };
}

export async function getCategories() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
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
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();
  const category = await Category.create({ ...data, userId });
  revalidatePath("/categories");
  return serializeDocument(category.toObject());
}

export async function updateCategory(
  id: string,
  data: { name: string; type: string; color: string; icon: string },
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();
  const category = await Category.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
  }).lean();
  revalidatePath("/categories");
  return serializeDocument(category);
}

export async function deleteCategory(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();
  await Category.findOneAndDelete({ _id: id, userId });
  revalidatePath("/categories");
  return { success: true };
}
