export interface OutboxItem {
  id: string;
  timestamp: string;
  eventType: string;
  eventData: any;
}
