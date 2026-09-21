import { useEffect, useState } from 'react';
import { getCustomers, type CustomerListResponse } from '../api/customers';
import { useAuthenticatedApi } from '../auth/useAuthenticatedApi';

type Props = {
  onBack: () => void;
};

export function CustomerList({ onBack }: Props) {
  const runAuthenticated = useAuthenticatedApi();
  const [customers, setCustomers] = useState<CustomerListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void runAuthenticated((token) => getCustomers(token))
      .then((response) => {
        if (active) setCustomers(response);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '顧客一覧を取得できませんでした。');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runAuthenticated]);

  return (
    <main>
      <button type="button" onClick={onBack}>顧客登録画面に戻る</button>
      <section aria-labelledby="customer-list-heading" className="customer-list">
        <h1 id="customer-list-heading">顧客一覧</h1>

        {isLoading && <p role="status">顧客一覧を読み込み中...</p>}
        {error && <p role="alert">{error}</p>}

        {!isLoading && error === '' && customers?.items.length === 0 && (
          <p>該当する顧客がありません。</p>
        )}

        {!isLoading && error === '' && customers !== null && customers.items.length > 0 && (
          <table>
            <caption>顧客一覧</caption>
            <thead>
              <tr>
                <th scope="col">顧客名</th>
                <th scope="col">分類</th>
              </tr>
            </thead>
            <tbody>
              {customers.items.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.category ?? '未分類'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
