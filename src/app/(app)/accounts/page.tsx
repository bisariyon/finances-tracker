import { getAccounts } from '@/actions/accounts-categories';
import AccountsClient from './AccountsClient';

export default async function AccountsPage() {
  const accounts = await getAccounts();
  return <AccountsClient initialAccounts={accounts} />;
}
