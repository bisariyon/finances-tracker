import { getAccounts, getCategories } from '@/actions/accounts-categories';
import { getMerchants } from '@/actions/merchants';
import { getTransactions } from '@/actions/transactions';
import TransactionsClient from './TransactionsClient';

export default async function TransactionsPage() {
  const [accounts, categories, merchants, { transactions, total }] = await Promise.all([
    getAccounts(),
    getCategories(),
    getMerchants(),
    getTransactions({ page: 1, limit: 30 }),
  ]);

  return (
    <TransactionsClient
      initialTransactions={transactions}
      initialTotal={total}
      accounts={accounts}
      categories={categories}
      merchants={merchants}
    />
  );
}
