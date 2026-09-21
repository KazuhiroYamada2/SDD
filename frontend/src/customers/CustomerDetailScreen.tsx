import { useEffect, useState } from 'react';
import { getCustomer, type Customer } from '../api/customers';
import { useAuthenticatedApi } from '../auth/useAuthenticatedApi';

type Props = {
  customerId: string;
  onBack: () => void;
};

const optionalValue = (value: string | null) => value ?? '未登録';

export function CustomerDetailScreen({ customerId, onBack }: Props) {
  const runAuthenticated = useAuthenticatedApi();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void runAuthenticated((token) => getCustomer(customerId, token))
      .then((response) => {
        if (active) setCustomer(response);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '顧客情報を取得できませんでした。');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerId, runAuthenticated]);

  return (
    <main>
      <button type="button" onClick={onBack}>顧客一覧へ戻る</button>
      <section aria-labelledby="customer-read-detail-heading" className="customer-detail">
        <h1 id="customer-read-detail-heading">顧客詳細</h1>

        {isLoading && <p role="status">顧客情報を読み込み中...</p>}
        {error && <p role="alert">{error}</p>}

        {!isLoading && error === '' && customer !== null && (
          <dl>
            <div><dt>顧客名</dt><dd>{customer.name}</dd></div>
            <div><dt>顧客名（カナ）</dt><dd>{optionalValue(customer.name_kana)}</dd></div>
            <div><dt>メールアドレス</dt><dd>{optionalValue(customer.email)}</dd></div>
            <div><dt>電話番号</dt><dd>{optionalValue(customer.phone)}</dd></div>
            <div><dt>住所</dt><dd>{optionalValue(customer.address)}</dd></div>
            <div><dt>分類</dt><dd>{customer.category ?? '未分類'}</dd></div>
          </dl>
        )}
      </section>
    </main>
  );
}
