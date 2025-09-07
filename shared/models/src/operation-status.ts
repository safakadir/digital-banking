/**
 * Operation status model for tracking async operations
 */
export interface OperationStatus {
  operationId: string;
  accountId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}
