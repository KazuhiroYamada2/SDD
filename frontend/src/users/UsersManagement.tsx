import { useCallback, useEffect, useState } from 'react';
import type { UserRole } from '../auth/auth-types';
import { useAuthentication } from '../auth/AuthContext';
import { useAuthenticatedApi } from '../auth/useAuthenticatedApi';
import { changeUserRole, getUsers, type ManagedUser } from '../api/users';

type Props = { onBack: () => void };

export function UsersManagement({ onBack }: Props) {
  const { authentication } = useAuthentication();
  const runAuthenticated = useAuthenticatedApi();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    const result = await runAuthenticated((token) => getUsers(token));
    setUsers(result);
    setSelectedRoles(Object.fromEntries(result.map((user) => [user.id, user.role])));
  }, [runAuthenticated]);

  useEffect(() => {
    let active = true;
    void loadUsers()
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'ユーザー一覧を取得できませんでした。');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [loadUsers]);

  const submitRole = async (user: ManagedUser) => {
    setError('');
    setChangingUserId(user.id);
    try {
      await runAuthenticated((token) => changeUserRole(user.id, selectedRoles[user.id] ?? user.role, token));
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ユーザーのroleを変更できませんでした。');
    } finally {
      setChangingUserId(null);
    }
  };

  return (
    <main>
      <button type="button" onClick={onBack}>顧客登録画面に戻る</button>
      <h1>ユーザー管理</h1>
      {isLoading && <p role="status">ユーザー一覧を読み込み中...</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && users.length > 0 && <table>
        <caption>ユーザー一覧</caption>
        <thead><tr><th scope="col">メールアドレス</th><th scope="col">状態</th><th scope="col">role</th><th scope="col">操作</th></tr></thead>
        <tbody>{users.map((user) => {
          const isSelf = user.id === authentication?.user.id;
          return <tr key={user.id}>
            <td>{user.email}</td>
            <td>{user.active ? 'active' : 'inactive'}</td>
            <td>
              <label className="visually-hidden" htmlFor={`user-role-${user.id}`}>{user.email}のrole</label>
              <select
                id={`user-role-${user.id}`}
                value={selectedRoles[user.id] ?? user.role}
                disabled={isSelf || changingUserId === user.id}
                onChange={(event) => setSelectedRoles((current) => ({
                  ...current,
                  [user.id]: event.target.value as UserRole,
                }))}
              >
                <option value="staff">staff</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </td>
            <td><button
              type="button"
              disabled={isSelf || changingUserId === user.id || (selectedRoles[user.id] ?? user.role) === user.role}
              onClick={() => void submitRole(user)}
            >{changingUserId === user.id ? '変更中...' : `roleを変更: ${user.email}`}</button></td>
          </tr>;
        })}</tbody>
      </table>}
    </main>
  );
}

