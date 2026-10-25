import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongoose";
import { Transaction } from "@/models/Transaction";
import { Account } from "@/models/Account";
import "@/models/Category";

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+@\t\r-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await connectToDatabase();
  const transactions = await Transaction.find({ userId })
    .sort({ date: 1, createdAt: 1 })
    .populate({ path: "accountId", model: Account, select: "name" })
    .populate({ path: "toAccountId", model: Account, select: "name" })
    .populate("categoryId", "name")
    .lean();

  const rows = [
    ["Date", "Type", "Amount", "Account", "Transfer To", "Category", "Merchant", "Notes", "Tags"],
    ...transactions.map((transaction) => {
      const account = transaction.accountId as unknown as { name?: string };
      const destination = transaction.toAccountId as unknown as { name?: string } | undefined;
      const category = transaction.categoryId as unknown as { name?: string } | undefined;
      return [
        new Date(transaction.date).toISOString(),
        transaction.type,
        transaction.amount,
        account?.name,
        destination?.name,
        category?.name,
        transaction.merchantName,
        transaction.notes,
        transaction.tags?.join(", "),
      ];
    }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
