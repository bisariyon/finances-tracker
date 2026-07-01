export const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "wallet", label: "Wallet" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "meal_card", label: "Meal Card" },
  { value: "investment", label: "Investment" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "investment", label: "Investment" },
  { value: "refund", label: "Refund" },
  { value: "loan", label: "Loan" },
  { value: "repayment", label: "Repayment" },
] as const;

export const CATEGORY_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

export const ACCOUNT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
];

export const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#6366f1",
];

export const DEFAULT_CATEGORIES = [
  {
    name: "Food & Dining",
    type: "expense",
    color: "#f97316",
    icon: "Utensils",
  },
  { name: "Shopping", type: "expense", color: "#ec4899", icon: "ShoppingBag" },
  { name: "Transport", type: "expense", color: "#3b82f6", icon: "Car" },
  {
    name: "Entertainment",
    type: "expense",
    color: "#8b5cf6",
    icon: "Clapperboard",
  },
  { name: "Bills & Utilities", type: "expense", color: "#ef4444", icon: "Zap" },
  { name: "Health", type: "expense", color: "#22c55e", icon: "HeartPulse" },
  { name: "Education", type: "expense", color: "#14b8a6", icon: "BookOpen" },
  { name: "Travel", type: "expense", color: "#06b6d4", icon: "Plane" },
  {
    name: "Personal Care",
    type: "expense",
    color: "#eab308",
    icon: "Sparkles",
  },
  {
    name: "Groceries",
    type: "expense",
    color: "#84cc16",
    icon: "ShoppingCart",
  },
  { name: "Salary", type: "income", color: "#22c55e", icon: "Banknote" },
  { name: "Freelance", type: "income", color: "#14b8a6", icon: "Laptop" },
  { name: "Business", type: "income", color: "#6366f1", icon: "Briefcase" },
  {
    name: "Investment Returns",
    type: "income",
    color: "#f97316",
    icon: "TrendingUp",
  },
  { name: "Gift", type: "income", color: "#ec4899", icon: "Gift" },
];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
