import { getAnalyticsData } from '@/actions/transactions';
import { getAccounts, getCategories } from '@/actions/accounts-categories';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
  const year = new Date().getFullYear();
  const [analyticsData, accounts, categories] = await Promise.all([
    getAnalyticsData(year),
    getAccounts(),
    getCategories(),
  ]);
  return <AnalyticsClient initialData={analyticsData} defaultYear={year} accounts={accounts} categories={categories} />;
}
