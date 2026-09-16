export type AdminTab = 'dashboard' | 'courses' | 'ead-content' | 'classes' | 'students' | 'coupons' | 'orders' | 'audit';
export type Period = 'day' | 'week' | 'month' | 'year';

export interface AdminNotification {
  type: 'success' | 'error';
  message: string;
}
