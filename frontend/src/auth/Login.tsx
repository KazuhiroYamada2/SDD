import { useRef, useState, type FormEvent } from 'react';
import { login, LoginApiError } from '../api/auth';
import { useAuthentication } from './AuthContext';

export function Login() {
  const { setAuthentication, clearAuthentication } = useAuthentication();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      const result = await login({ email: email.trim(), password });
      setAuthentication(result);
    } catch (cause) {
      clearAuthentication();
      setError(cause instanceof LoginApiError ? cause.message : 'ログイン処理を完了できませんでした。');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <h1>ログイン</h1>
      <form noValidate onSubmit={submit}>
        <label htmlFor="login-email">メールアドレス</label>
        <input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="login-password">パスワード</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p role="alert">{error}</p>}
        {isSubmitting && <p role="status">ログイン中…</p>}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'ログイン中…' : 'ログイン'}</button>
      </form>
    </main>
  );
}
