export interface JournalEntry {
  id: string;
  transactionId: string;
  accountId: string;
  userId: string;
  operationId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  createdAt: string;
}
