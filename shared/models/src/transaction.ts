/**
 * Transaction model for transaction history
 */
export interface Transaction {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  balance: number;
  status: 'completed' | 'failed';
  timestamp: string;
  description: string;
}
