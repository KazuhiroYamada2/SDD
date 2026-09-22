import type { Customer } from '../api/customers';
import { ActivityHistory } from '../activities/ActivityHistory';

type Props = {
  customer: Customer;
  onBack: () => void;
};

export function CustomerDetail({ customer, onBack }: Props) {
  return (
    <main>
      <button type="button" onClick={onBack}>顧客登録画面に戻る</button>
      <section aria-labelledby="customer-detail-heading" className="customer-detail">
        <h1 id="customer-detail-heading">顧客詳細</h1>
        <dl>
          <div><dt>顧客名</dt><dd>{customer.name}</dd></div>
          <div><dt>担当ユーザーID</dt><dd>{customer.owner_user_id}</dd></div>
        </dl>
      </section>
      <ActivityHistory customerId={customer.id} ownerUserId={customer.owner_user_id} />
    </main>
  );
}
