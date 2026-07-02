import { getDashboardData } from '@/actions/transactions';
import DashboardClient from '../DashboardClient';

export default async function DashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const data = await getDashboardData(month, year);

  return <DashboardClient initialData={data} defaultMonth={month} defaultYear={year} />;
}
