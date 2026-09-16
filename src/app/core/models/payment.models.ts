export interface PaymentWebhookEvent {
  id: number;
  eventId: string;
  orderId: number;
  paymentId: string;
  status: string;
  receivedAt: string;
  processedAt?: string | null;
}
