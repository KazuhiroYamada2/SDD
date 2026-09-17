export type ActivityType = 'visit' | 'meeting';

export type Activity = {
  id: string;
  customer_id: string;
  user_id: string;
  activity_type: ActivityType;
  visited_at: string | null;
  meeting_note: string | null;
  next_visit_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateActivityInput = {
  user_id: string;
  activity_type: ActivityType;
  visited_at?: string;
  meeting_note?: string;
  next_visit_at?: string;
};

type ApiError = { message?: string };

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

const errorMessage = async (response: Response, fallback: string) => {
  const error = await response.json().catch((): ApiError => ({}));
  return error.message ?? fallback;
};

export const getActivities = async (customerId: string): Promise<Activity[]> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/customers/${customerId}/activities`);
  if (!response.ok) {
    throw new Error(await errorMessage(response, '営業活動履歴を取得できませんでした。'));
  }
  return response.json() as Promise<Activity[]>;
};

export const registerActivity = async (customerId: string, input: CreateActivityInput): Promise<Activity> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/customers/${customerId}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, '営業活動を登録できませんでした。'));
  }
  return response.json() as Promise<Activity>;
};
