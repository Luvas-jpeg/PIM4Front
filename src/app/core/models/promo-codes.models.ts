export interface PromoCode {
  id: number;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageLimit?: number | null;
  usageCount: number;
}

export interface PromoCodeRequest {
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageLimit?: number | null;
  usageCount: number;
}
