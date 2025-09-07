/**
 * Operation model for tracking async operations
 */
export interface Operation {
  operationId: string;
  accountId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}
