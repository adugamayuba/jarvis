export type BankingTransaction = {
  id: string;
  date: string;
  description: string;
  counterparty: string;
  category: string;
  amount: number;
  status: "completed" | "pending";
  accountId: string;
};

export type BankingAccount = {
  id: string;
  name: string;
  type: "checking" | "savings";
  lastFour: string;
  balance: number;
  routingLastFour: string;
};

export const BANKING_META = {
  entity: "Reelin AI Inc.",
  bank: "Mercury",
  currency: "USD",
  asOf: "2026-06-08",
  userFirstName: "Ligia",
  userInitials: "LT",
};

export const PAYEES = [
  "Abel Adugam",
  "Argil, Inc.",
  "Google LLC",
  "OpenAI, LLC",
  "Vercel Inc.",
  "Contractor Services LLC",
];

export const INITIAL_ACCOUNTS: BankingAccount[] = [
  {
    id: "checking-primary",
    name: "Operating",
    type: "checking",
    lastFour: "4821",
    balance: 22_314.87,
    routingLastFour: "9024",
  },
  {
    id: "savings-treasury",
    name: "Treasury",
    type: "savings",
    lastFour: "7103",
    balance: 2_532.45,
    routingLastFour: "9024",
  },
];

export const INITIAL_TRANSACTIONS: BankingTransaction[] = [
  {
    id: "tx-001",
    date: "2026-06-05",
    description: "Argil Inc — monthly video credits",
    counterparty: "Argil, Inc.",
    category: "Software",
    amount: -9_920.0,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-002",
    date: "2026-06-04",
    description: "OpenAI API usage",
    counterparty: "OpenAI, LLC",
    category: "Software",
    amount: -412.18,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-003",
    date: "2026-06-03",
    description: "Stripe payout — consumer subscriptions",
    counterparty: "Stripe Payments",
    category: "Revenue",
    amount: 1_248.6,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-004",
    date: "2026-06-02",
    description: "Google Cloud Platform",
    counterparty: "Google LLC",
    category: "Infrastructure",
    amount: -687.42,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-005",
    date: "2026-06-01",
    description: "Railway — production hosting",
    counterparty: "Railway Corp.",
    category: "Infrastructure",
    amount: -89.0,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-006",
    date: "2026-05-28",
    description: "Mercury Treasury interest",
    counterparty: "Mercury",
    category: "Interest",
    amount: 14.22,
    status: "completed",
    accountId: "savings-treasury",
  },
  {
    id: "tx-007",
    date: "2026-05-22",
    description: "Transfer to Treasury",
    counterparty: "Internal transfer",
    category: "Transfer",
    amount: -2_500.0,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-008",
    date: "2026-05-22",
    description: "Transfer from Operating",
    counterparty: "Internal transfer",
    category: "Transfer",
    amount: 2_500.0,
    status: "completed",
    accountId: "savings-treasury",
  },
  {
    id: "tx-009",
    date: "2026-05-18",
    description: "Apple Developer Program",
    counterparty: "Apple Inc.",
    category: "Software",
    amount: -99.0,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-010",
    date: "2026-05-14",
    description: "Contractor payment — product design",
    counterparty: "Ligia Tica",
    category: "Payroll & contractors",
    amount: -2_800.0,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-011",
    date: "2026-05-08",
    description: "SAFE note — angel allocation",
    counterparty: "NextUnicorn Fund",
    category: "Funding",
    amount: 50_000.0,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-012",
    date: "2026-05-02",
    description: "Legal — incorporation & SAFE docs",
    counterparty: "Clerky",
    category: "Legal",
    amount: -799.0,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-013",
    date: "2026-04-24",
    description: "Firebase / Google Cloud",
    counterparty: "Google LLC",
    category: "Infrastructure",
    amount: -156.33,
    status: "completed",
    accountId: "checking-primary",
  },
  {
    id: "tx-014",
    date: "2026-04-15",
    description: "Vercel Pro — frontend hosting",
    counterparty: "Vercel Inc.",
    category: "Infrastructure",
    amount: -20.0,
    status: "completed",
    accountId: "checking-primary",
  },
];

export const ACCOUNTS = INITIAL_ACCOUNTS;
export const TRANSACTIONS = INITIAL_TRANSACTIONS;
export const TOTAL_BALANCE = INITIAL_ACCOUNTS.reduce((sum, a) => sum + a.balance, 0);

export function getMonthFlow(transactions: BankingTransaction[], yearMonth: string) {
  return transactions
    .filter((t) => t.date.startsWith(yearMonth))
    .reduce(
      (acc, t) => {
        if (t.amount >= 0) acc.in += t.amount;
        else acc.out += Math.abs(t.amount);
        return acc;
      },
      { in: 0, out: 0 }
    );
}

export const JUNE_2026_FLOW = getMonthFlow(INITIAL_TRANSACTIONS, "2026-06");
