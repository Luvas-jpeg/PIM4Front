export interface AuditLog {
  id: number;
  userId: number | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
}
