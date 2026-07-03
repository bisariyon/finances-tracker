"use server";

import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import { Transaction } from "@/models/Transaction";
import { Account } from "@/models/Account";
import "@/models/Category";
import { incrementMerchantUsage } from "./merchants";
import { serializeDocument, startOfMonth, endOfMonth } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

export async function getTransactions(filters?: {
  month?: number;
  year?: number;
  accountId?: string;
  categoryId?: string;
  type?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const query: any = { userId };
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;

  if (filters?.month && filters?.year) {
    query.date = {
      $gte: startOfMonth(filters.year, filters.month),
      $lte: endOfMonth(filters.year, filters.month),
    };
  } else if (filters?.year) {
    query.date = {
      $gte: new Date(filters.year, 0, 1),
      $lte: new Date(filters.year, 11, 31, 23, 59, 59, 999),
    };
  }

  if (filters?.accountId)
    query.accountId = new mongoose.Types.ObjectId(filters.accountId);
  if (filters?.categoryId)
    query.categoryId = new mongoose.Types.ObjectId(filters.categoryId);
  if (filters?.type) query.type = filters.type;
  if (filters?.tags?.length) query.tags = { $in: filters.tags };
  if (filters?.search) {
    const regex = new RegExp(filters.search, "i");
    query.$or = [{ merchantName: regex }, { notes: regex }, { tags: regex }];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("accountId", "name type color")
      .populate("toAccountId", "name type color")
      .populate("categoryId", "name color icon")
      .populate("merchantId", "canonicalName aliases")
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return { transactions: serializeDocument(transactions), total, page, limit };
}

export async function createTransaction(data: {
  amount: number;
  type: string;
  date: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  merchantId?: string;
  merchantName?: string;
  tags: string[];
  notes?: string;
  receiptUrl?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const txData = {
      ...data,
      userId,
      date: new Date(data.date),
      accountId: new mongoose.Types.ObjectId(data.accountId),
      toAccountId: data.toAccountId
        ? new mongoose.Types.ObjectId(data.toAccountId)
        : undefined,
      categoryId: data.categoryId
        ? new mongoose.Types.ObjectId(data.categoryId)
        : undefined,
      merchantId: data.merchantId
        ? new mongoose.Types.ObjectId(data.merchantId)
        : undefined,
      merchantName: data.merchantName?.trim() || undefined,
    };

    const [transaction] = await Transaction.create([txData], { session });

    // Update account balances
    if (
      data.type === "expense" ||
      data.type === "investment" ||
      data.type === "loan"
    ) {
      await Account.findByIdAndUpdate(
        data.accountId,
        { $inc: { balance: -data.amount } },
        { session },
      );
    } else if (
      data.type === "income" ||
      data.type === "refund" ||
      data.type === "repayment"
    ) {
      await Account.findByIdAndUpdate(
        data.accountId,
        { $inc: { balance: data.amount } },
        { session },
      );
    } else if (data.type === "transfer" && data.toAccountId) {
      await Account.findByIdAndUpdate(
        data.accountId,
        { $inc: { balance: -data.amount } },
        { session },
      );
      await Account.findByIdAndUpdate(
        data.toAccountId,
        { $inc: { balance: data.amount } },
        { session },
      );
    }

    await session.commitTransaction();

    // Increment merchant usage outside the transaction
    if (data.merchantId) {
      await incrementMerchantUsage(data.merchantId).catch(() => {});
    }

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");

    return serializeDocument(transaction.toObject());
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateTransaction(
  id: string,
  data: {
    amount: number;
    type: string;
    date: string;
    accountId: string;
    toAccountId?: string;
    categoryId?: string;
    merchantId?: string;
    merchantName?: string;
    tags: string[];
    notes?: string;
  },
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Reverse old transaction
    const old = await Transaction.findOne({ _id: id, userId });
    if (!old) throw new Error("Transaction not found");

    // Reverse old balance changes
    if (
      old.type === "expense" ||
      old.type === "investment" ||
      old.type === "loan"
    ) {
      await Account.findByIdAndUpdate(
        old.accountId,
        { $inc: { balance: old.amount } },
        { session },
      );
    } else if (
      old.type === "income" ||
      old.type === "refund" ||
      old.type === "repayment"
    ) {
      await Account.findByIdAndUpdate(
        old.accountId,
        { $inc: { balance: -old.amount } },
        { session },
      );
    } else if (old.type === "transfer" && old.toAccountId) {
      await Account.findByIdAndUpdate(
        old.accountId,
        { $inc: { balance: old.amount } },
        { session },
      );
      await Account.findByIdAndUpdate(
        old.toAccountId,
        { $inc: { balance: -old.amount } },
        { session },
      );
    }

    // Apply new changes
    const updated = await Transaction.findByIdAndUpdate(
      id,
      {
        ...data,
        date: new Date(data.date),
        accountId: new mongoose.Types.ObjectId(data.accountId),
        toAccountId: data.toAccountId
          ? new mongoose.Types.ObjectId(data.toAccountId)
          : undefined,
        categoryId: data.categoryId
          ? new mongoose.Types.ObjectId(data.categoryId)
          : undefined,
        merchantId: data.merchantId
          ? new mongoose.Types.ObjectId(data.merchantId)
          : undefined,
        merchantName: data.merchantName?.trim() || undefined,
      },
      { new: true, session },
    );

    if (
      data.type === "expense" ||
      data.type === "investment" ||
      data.type === "loan"
    ) {
      await Account.findByIdAndUpdate(
        data.accountId,
        { $inc: { balance: -data.amount } },
        { session },
      );
    } else if (
      data.type === "income" ||
      data.type === "refund" ||
      data.type === "repayment"
    ) {
      await Account.findByIdAndUpdate(
        data.accountId,
        { $inc: { balance: data.amount } },
        { session },
      );
    } else if (data.type === "transfer" && data.toAccountId) {
      await Account.findByIdAndUpdate(
        data.accountId,
        { $inc: { balance: -data.amount } },
        { session },
      );
      await Account.findByIdAndUpdate(
        data.toAccountId,
        { $inc: { balance: data.amount } },
        { session },
      );
    }

    await session.commitTransaction();
    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    return serializeDocument(updated?.toObject());
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function deleteTransaction(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tx = await Transaction.findOne({ _id: id, userId });
    if (!tx) throw new Error("Transaction not found");

    // Reverse balance
    if (
      tx.type === "expense" ||
      tx.type === "investment" ||
      tx.type === "loan"
    ) {
      await Account.findByIdAndUpdate(
        tx.accountId,
        { $inc: { balance: tx.amount } },
        { session },
      );
    } else if (
      tx.type === "income" ||
      tx.type === "refund" ||
      tx.type === "repayment"
    ) {
      await Account.findByIdAndUpdate(
        tx.accountId,
        { $inc: { balance: -tx.amount } },
        { session },
      );
    } else if (tx.type === "transfer" && tx.toAccountId) {
      await Account.findByIdAndUpdate(
        tx.accountId,
        { $inc: { balance: tx.amount } },
        { session },
      );
      await Account.findByIdAndUpdate(
        tx.toAccountId,
        { $inc: { balance: -tx.amount } },
        { session },
      );
    }

    await Transaction.findByIdAndDelete(id, { session });
    await session.commitTransaction();
    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getDashboardData(month: number, year: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const start = startOfMonth(year, month);
  const end = endOfMonth(year, month);

  const [monthlyTx, accounts, recentTx] = await Promise.all([
    Transaction.find({ userId, date: { $gte: start, $lte: end } })
      .populate("categoryId", "name color icon")
      .populate("accountId", "name type color")
      .lean(),
    Account.find({ userId }).lean(),
    Transaction.find({ userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .populate("categoryId", "name color icon")
      .populate("accountId", "name type color")
      .populate("toAccountId", "name type color")
      .lean(),
  ]);

  const totalIncome = monthlyTx
    .filter((t) => t.type === "income" || t.type === "refund")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = monthlyTx
    .filter((t) => t.type === "expense" || t.type === "investment")
    .reduce((s, t) => s + t.amount, 0);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Category breakdown
  const categoryMap: Record<
    string,
    { name: string; color: string; icon: string; amount: number }
  > = {};
  for (const tx of monthlyTx) {
    if (tx.type === "expense" && tx.categoryId) {
      const cat = tx.categoryId as any;
      const key = cat._id.toString();
      if (!categoryMap[key]) {
        categoryMap[key] = {
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          amount: 0,
        };
      }
      categoryMap[key].amount += tx.amount;
    }
  }

  // Merchant breakdown
  const merchantMap: Record<string, { name: string; amount: number }> = {};
  for (const tx of monthlyTx) {
    if (tx.type === "expense" && tx.merchantName) {
      const key = tx.merchantName;
      if (!merchantMap[key]) merchantMap[key] = { name: key, amount: 0 };
      merchantMap[key].amount += tx.amount;
    }
  }

  // Monthly trend (last 6 months)
  const trendData: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const periodTx = await Transaction.find({
      userId,
      date: { $gte: startOfMonth(y, m), $lte: endOfMonth(y, m) },
    }).lean();
    trendData.push({
      month: d.toLocaleString("default", { month: "short" }),
      income: periodTx
        .filter((t) => t.type === "income" || t.type === "refund")
        .reduce((s, t) => s + t.amount, 0),
      expense: periodTx
        .filter((t) => t.type === "expense" || t.type === "investment")
        .reduce((s, t) => s + t.amount, 0),
    });
  }

  return serializeDocument({
    totalBalance,
    totalIncome,
    totalExpense,
    savings: totalIncome - totalExpense,
    accounts,
    recentTransactions: recentTx,
    categoryBreakdown: Object.values(categoryMap).sort(
      (a, b) => b.amount - a.amount,
    ),
    merchantBreakdown: Object.values(merchantMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    monthlyTrend: trendData,
  });
}

export async function getAnalyticsData(year: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const allTx = await Transaction.find({
    userId,
    date: { $gte: start, $lte: end },
  })
    .populate("categoryId", "name color icon")
    .populate("accountId", "name type color")
    .lean();

  // Monthly breakdown
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const monthTx = allTx.filter((t) => new Date(t.date).getMonth() === i);
    return {
      month: new Date(year, i).toLocaleString("default", { month: "short" }),
      income: monthTx
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
      expense: monthTx
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    };
  });

  // Category breakdown for year
  const categoryMap: Record<
    string,
    { name: string; color: string; icon: string; amount: number }
  > = {};
  for (const tx of allTx) {
    if (tx.type === "expense" && tx.categoryId) {
      const cat = tx.categoryId as any;
      const key = cat._id.toString();
      if (!categoryMap[key])
        categoryMap[key] = {
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          amount: 0,
        };
      categoryMap[key].amount += tx.amount;
    }
  }

  const totalIncome = allTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = allTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return serializeDocument({
    monthly,
    categoryBreakdown: Object.values(categoryMap).sort(
      (a, b) => b.amount - a.amount,
    ),
    totalIncome,
    totalExpense,
    savings: totalIncome - totalExpense,
  });
}

export async function getMonthlyBreakdown(year: number, month: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await connectToDatabase();

  const start = startOfMonth(year, month);
  const end = endOfMonth(year, month);

  const txs = await Transaction.find({
    userId,
    date: { $gte: start, $lte: end },
  })
    .populate("categoryId", "name color icon")
    .populate("accountId", "name type color")
    .lean();

  const categoryMap: Record<
    string,
    { name: string; color: string; icon: string; amount: number }
  > = {};
  
  const merchantMap: Record<string, { name: string; amount: number }> = {};
  
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of txs) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (tx.type === "expense") {
      totalExpense += tx.amount;
      
      if (tx.categoryId) {
        const cat = tx.categoryId as any;
        const catId = cat._id.toString();
        if (!categoryMap[catId]) {
          categoryMap[catId] = {
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            amount: 0,
          };
        }
        categoryMap[catId].amount += tx.amount;
      }

      if (tx.merchantName) {
        const mKey = tx.merchantName;
        if (!merchantMap[mKey]) {
          merchantMap[mKey] = { name: mKey, amount: 0 };
        }
        merchantMap[mKey].amount += tx.amount;
      }
    }
  }

  return serializeDocument({
    totalIncome,
    totalExpense,
    savings: totalIncome - totalExpense,
    categoryBreakdown: Object.values(categoryMap).sort((a, b) => b.amount - a.amount),
    merchantBreakdown: Object.values(merchantMap).sort((a, b) => b.amount - a.amount),
  });
}

