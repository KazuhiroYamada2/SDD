export type SalesTrendItem = {
  month: string;
  salesAmount: string;
};

export type SalesTrendResponse = {
  from: string;
  to: string;
  items: SalesTrendItem[];
};

export type CustomerCategoryItem = {
  category: string;
  customerCount: number;
};

export type CustomerCategoriesResponse = {
  items: CustomerCategoryItem[];
};

export type StaffPerformanceItem = {
  staffId: string;
  staffEmail: string;
  salesAmount: string;
  salesCount: number;
};

export type StaffPerformanceResponse = {
  from: string;
  to: string;
  items: StaffPerformanceItem[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

const errorMessage = async (response: Response, fallbackMessage: string): Promise<string> => {
  const error: unknown = await response.json().catch(() => null);
  if (typeof error === 'object' && error !== null && 'message' in error &&
      typeof error.message === 'string' && error.message.trim() !== '') {
    return error.message;
  }
  return fallbackMessage;
};

export const getSalesTrend = async (from: string, to: string): Promise<SalesTrendResponse> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/reports/sales-trend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!response.ok) {
    throw new Error(await errorMessage(response, '売上推移を取得できませんでした。'));
  }

  return response.json() as Promise<SalesTrendResponse>;
};

export const getCustomerCategories = async (): Promise<CustomerCategoriesResponse> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/reports/customer-categories`);
  if (!response.ok) {
    throw new Error(await errorMessage(response, '顧客分類を取得できませんでした。'));
  }

  return response.json() as Promise<CustomerCategoriesResponse>;
};

export const getStaffPerformance = async (from: string, to: string): Promise<StaffPerformanceResponse> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/reports/staff-performance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!response.ok) {
    throw new Error(await errorMessage(response, '営業担当者別実績を取得できませんでした。'));
  }

  return response.json() as Promise<StaffPerformanceResponse>;
};
