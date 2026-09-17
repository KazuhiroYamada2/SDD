export type SalesTrendItem = {
  month: string;
  salesAmount: string;
};

export type SalesTrendResponse = {
  from: string;
  to: string;
  items: SalesTrendItem[];
};

type ApiError = {
  message?: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

const errorMessage = async (response: Response): Promise<string> => {
  const error = await response.json().catch((): ApiError => ({}));
  return error.message ?? '売上推移を取得できませんでした。';
};

export const getSalesTrend = async (from: string, to: string): Promise<SalesTrendResponse> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/reports/sales-trend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  return response.json() as Promise<SalesTrendResponse>;
};
