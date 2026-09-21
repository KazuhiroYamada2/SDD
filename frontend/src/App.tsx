import { useState } from 'react';
import { registerCustomer, type CreateCustomerInput, type Customer } from './api/customers';
import { CustomerDetail } from './customers/CustomerDetail';
import { CustomerDetailScreen } from './customers/CustomerDetailScreen';
import {
  CustomerList,
  initialCustomerListState,
  type CustomerListState,
} from './customers/CustomerList';
import { ReportsPage } from './reports/ReportsPage';
import { AuthProvider, useAuthentication } from './auth/AuthContext';
import { Login } from './auth/Login';
import { useAuthenticatedApi } from './auth/useAuthenticatedApi';

type FormValues = {
  name: string;
  owner_user_id: string;
  name_kana: string;
  email: string;
  phone: string;
  address: string;
  category: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type Screen = 'customerRegistration' | 'customerList' | 'customerDetail' | 'reports';

const initialValues: FormValues = {
  name: '',
  owner_user_id: '',
  name_kana: '',
  email: '',
  phone: '',
  address: '',
  category: '',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (values: FormValues): FormErrors => {
  const errors: FormErrors = {};

  if (values.name.trim() === '') {
    errors.name = '顧客名を入力してください。';
  }
  if (!uuidPattern.test(values.owner_user_id)) {
    errors.owner_user_id = '担当ユーザーIDはUUID形式で入力してください。';
  }
  if (values.email.trim() !== '' && !emailPattern.test(values.email.trim())) {
    errors.email = 'メールアドレスの形式で入力してください。';
  }

  return errors;
};

const toRequest = (values: FormValues): CreateCustomerInput => {
  const optionalEntries = Object.entries(values)
    .filter(([field, value]) => field !== 'name' && field !== 'owner_user_id' && value.trim() !== '');

  return {
    name: values.name.trim(),
    owner_user_id: values.owner_user_id,
    ...Object.fromEntries(optionalEntries.map(([field, value]) => [field, value.trim()])),
  } as CreateCustomerInput;
};

function BusinessApp() {
  const { authentication } = useAuthentication();
  const runAuthenticated = useAuthenticatedApi();
  const [screen, setScreen] = useState<Screen>('customerRegistration');
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerListState, setCustomerListState] = useState<CustomerListState>(initialCustomerListState);
  const canCreateCustomer = authentication?.user.role === 'staff' || authentication?.user.role === 'admin';
  const canViewReports = authentication?.user.role === 'manager' || authentication?.user.role === 'admin';

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setSuccessMessage('');
    setApiError('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const customer = await runAuthenticated((token) => registerCustomer(toRequest(values), token));
      setValues(initialValues);
      setSuccessMessage('顧客情報を登録しました。');
      setSelectedCustomer(customer);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : '顧客情報を登録できませんでした。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (screen === 'reports' && canViewReports) {
    return <ReportsPage onBack={() => {
      setSelectedCustomer(null);
      setScreen('customerRegistration');
    }} />;
  }

  if (screen === 'customerList') {
    return <CustomerList
      onBack={() => setScreen('customerRegistration')}
      listState={customerListState}
      setListState={setCustomerListState}
      onSelectCustomer={(customerId) => {
        setSelectedCustomerId(customerId);
        setScreen('customerDetail');
      }}
    />;
  }

  if (screen === 'customerDetail' && selectedCustomerId !== null) {
    return <CustomerDetailScreen customerId={selectedCustomerId} onBack={() => {
      setSelectedCustomerId(null);
      setScreen('customerList');
    }} />;
  }

  if (selectedCustomer !== null) {
    return <CustomerDetail customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <main>
      <button type="button" onClick={() => setScreen('customerList')}>顧客一覧</button>
      {canViewReports && <button type="button" onClick={() => setScreen('reports')}>レポート</button>}
      <h1>顧客管理システム</h1>
      {canCreateCustomer && <section aria-labelledby="customer-registration-heading" className="customer-registration">
        <h2 id="customer-registration-heading">顧客情報を登録</h2>
        <p>顧客名と担当ユーザーIDは必須です。</p>

        {successMessage && <p role="status" data-testid="customer-registration-success">{successMessage}</p>}
        {apiError && <p role="alert" data-testid="customer-registration-error">{apiError}</p>}

        <form data-testid="customer-registration-form" noValidate onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="customer-name">顧客名</label>
            <input
              id="customer-name"
              name="name"
              data-testid="customer-name-input"
              value={values.name}
              onChange={(event) => updateValue('name', event.target.value)}
              aria-invalid={errors.name !== undefined}
              aria-describedby={errors.name ? 'customer-name-error' : undefined}
            />
            {errors.name && <p id="customer-name-error" role="alert">{errors.name}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="owner-user-id">担当ユーザーID</label>
            <input
              id="owner-user-id"
              name="owner_user_id"
              data-testid="owner-user-id-input"
              value={values.owner_user_id}
              onChange={(event) => updateValue('owner_user_id', event.target.value)}
              aria-invalid={errors.owner_user_id !== undefined}
              aria-describedby={errors.owner_user_id ? 'owner-user-id-error' : undefined}
            />
            {errors.owner_user_id && <p id="owner-user-id-error" role="alert">{errors.owner_user_id}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="customer-name-kana">顧客名（カナ）</label>
            <input id="customer-name-kana" name="name_kana" data-testid="customer-name-kana-input" value={values.name_kana} onChange={(event) => updateValue('name_kana', event.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="customer-email">メールアドレス</label>
            <input
              id="customer-email"
              name="email"
              data-testid="customer-email-input"
              type="email"
              value={values.email}
              onChange={(event) => updateValue('email', event.target.value)}
              aria-invalid={errors.email !== undefined}
              aria-describedby={errors.email ? 'customer-email-error' : undefined}
            />
            {errors.email && <p id="customer-email-error" role="alert">{errors.email}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="customer-phone">電話番号</label>
            <input id="customer-phone" name="phone" data-testid="customer-phone-input" value={values.phone} onChange={(event) => updateValue('phone', event.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="customer-address">住所</label>
            <input id="customer-address" name="address" data-testid="customer-address-input" value={values.address} onChange={(event) => updateValue('address', event.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="customer-category">分類</label>
            <input id="customer-category" name="category" data-testid="customer-category-input" value={values.category} onChange={(event) => updateValue('category', event.target.value)} />
          </div>

          <button type="submit" data-testid="customer-submit-button" disabled={isSubmitting}>
            {isSubmitting ? '登録中…' : '登録する'}
          </button>
        </form>
      </section>}
    </main>
  );
}

function AuthenticatedApp() {
  const { authentication, authenticationNotice, clearAuthentication } = useAuthentication();

  if (authentication === null) {
    return <>
      {authenticationNotice && <p role="status">{authenticationNotice}</p>}
      <Login />
    </>;
  }

  return <>
    <header><button type="button" onClick={clearAuthentication}>ログアウト</button></header>
    <BusinessApp />
  </>;
}

export function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>;
}
