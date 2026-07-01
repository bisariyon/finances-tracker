import { getCategories } from '@/actions/accounts-categories';
import { getMerchants } from '@/actions/merchants';
import CategoriesClient from './CategoriesClient';

export default async function CategoriesPage() {
  const [categories, merchants] = await Promise.all([getCategories(), getMerchants()]);
  return <CategoriesClient initialCategories={categories} initialMerchants={merchants} />;
}
