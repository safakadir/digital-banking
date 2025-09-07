import { Transaction } from './transaction';

/**
 * Response model for transaction history queries
 */
export interface TransactionsResponse {
  transactions: Transaction[];
}
