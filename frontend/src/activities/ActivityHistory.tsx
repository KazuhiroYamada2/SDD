import { useEffect, useState } from 'react';
import { getActivities, registerActivity, type Activity, type ActivityType, type CreateActivityInput } from '../api/activities';
import { useAuthenticatedApi } from '../auth/useAuthenticatedApi';

type Props = {
  customerId: string;
  ownerUserId: string;
};

type FormValues = {
  user_id: string;
  activity_type: ActivityType;
  visited_at: string;
  meeting_note: string;
  next_visit_at: string;
};

const initialValues = (ownerUserId: string): FormValues => ({
  user_id: ownerUserId,
  activity_type: 'visit',
  visited_at: '',
  meeting_note: '',
  next_visit_at: '',
});

const toRequest = (values: FormValues): CreateActivityInput => ({
  user_id: values.user_id,
  activity_type: values.activity_type,
  ...(values.visited_at === '' ? {} : { visited_at: new Date(values.visited_at).toISOString() }),
  ...(values.meeting_note.trim() === '' ? {} : { meeting_note: values.meeting_note.trim() }),
  ...(values.next_visit_at === '' ? {} : { next_visit_at: new Date(values.next_visit_at).toISOString() }),
});

const activityTypeLabel = (activityType: ActivityType) =>
  activityType === 'visit' ? '訪問' : '商談';

const dateTimeLabel = (value: string | null) => value ?? '未設定';

export function ActivityHistory({ customerId, ownerUserId }: Props) {
  const runAuthenticated = useAuthenticatedApi();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [values, setValues] = useState<FormValues>(() => initialValues(ownerUserId));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadActivities = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setActivities(await runAuthenticated((token) => getActivities(customerId, token)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '営業活動履歴を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadActivities();
  }, [customerId]);

  const updateValue = <Field extends keyof FormValues>(field: Field, value: FormValues[Field]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      await runAuthenticated((token) => registerActivity(customerId, toRequest(values), token));
      setValues(initialValues(ownerUserId));
      setSuccessMessage('営業活動を登録しました。');
      await loadActivities();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '営業活動を登録できませんでした。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="activity-history-heading" className="activity-history">
      <h2 id="activity-history-heading">営業活動履歴</h2>

      {loadError && <p role="alert" data-testid="activity-history-error">{loadError}</p>}
      {isLoading ? <p role="status">営業活動履歴を読み込んでいます。</p> : (
        <ul aria-label="営業活動履歴一覧" className="activity-list">
          {activities.map((activity) => (
            <li key={activity.id}>
              <h3>{activityTypeLabel(activity.activity_type)}</h3>
              <dl>
                <div><dt>訪問日時</dt><dd>{dateTimeLabel(activity.visited_at)}</dd></div>
                <div><dt>商談内容</dt><dd>{activity.meeting_note ?? '未入力'}</dd></div>
                <div><dt>次回訪問予定</dt><dd>{dateTimeLabel(activity.next_visit_at)}</dd></div>
              </dl>
            </li>
          ))}
          {activities.length === 0 && <li>営業活動履歴はありません。</li>}
        </ul>
      )}

      <h2 id="activity-registration-heading">営業活動を登録</h2>
      {successMessage && <p role="status" data-testid="activity-registration-success">{successMessage}</p>}
      {submitError && <p role="alert" data-testid="activity-registration-error">{submitError}</p>}
      <form aria-labelledby="activity-registration-heading" noValidate onSubmit={submit}>
        <div className="form-field">
          <label htmlFor="activity-user-id">担当ユーザーID</label>
          <input id="activity-user-id" name="user_id" value={values.user_id} onChange={(event) => updateValue('user_id', event.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="activity-type">活動種別</label>
          <select id="activity-type" name="activity_type" value={values.activity_type} onChange={(event) => updateValue('activity_type', event.target.value as ActivityType)}>
            <option value="visit">訪問</option>
            <option value="meeting">商談</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="activity-visited-at">訪問日時</label>
          <input id="activity-visited-at" name="visited_at" type="datetime-local" value={values.visited_at} onChange={(event) => updateValue('visited_at', event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="activity-meeting-note">商談内容</label>
          <textarea id="activity-meeting-note" name="meeting_note" value={values.meeting_note} onChange={(event) => updateValue('meeting_note', event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="activity-next-visit-at">次回訪問予定</label>
          <input id="activity-next-visit-at" name="next_visit_at" type="datetime-local" value={values.next_visit_at} onChange={(event) => updateValue('next_visit_at', event.target.value)} />
        </div>
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? '営業活動を登録中…' : '営業活動を登録'}</button>
      </form>
    </section>
  );
}
