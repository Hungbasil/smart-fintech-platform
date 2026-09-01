import type { UserDTO } from '../services/api';
import { lockAdminUser, unlockAdminUser, changeAdminUserRole, deleteAdminUser, updateAdminUser } from '../services/api';
import { useEffect, useState } from 'react';
import { toast } from '../services/notifications';
import { MoreHorizontal, Pencil, Trash2, Lock, Unlock } from 'lucide-react';

interface UserTableProps {
  users: UserDTO[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function UserTable({ users, isLoading, onRefresh }: UserTableProps) {
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserDTO | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '' });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Kiểm tra xem click có nằm trong dropdown menu hoặc button không
      if (!target.closest('[data-user-menu]')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLockUser = async (userId: string) => {
    try {
      setActioningUserId(userId);
      await lockAdminUser(userId);
      toast.success('User locked successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to lock user');
      console.error(error);
    } finally {
      setActioningUserId(null);
    }
  };

  const handleUnlockUser = async (userId: string) => {
    try {
      setActioningUserId(userId);
      await unlockAdminUser(userId);
      toast.success('User unlocked successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to unlock user');
      console.error(error);
    } finally {
      setActioningUserId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      setActioningUserId(userId);
      await changeAdminUserRole(userId, { role: newRole });
      toast.success('User role changed successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to change user role');
      console.error(error);
    } finally {
      setActioningUserId(null);
    }
  };

  const openEditDialog = (user: UserDTO) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
    });
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    const trimmedFullName = editForm.fullName.trim();
    const trimmedEmail = editForm.email.trim();

    if (!trimmedFullName || !trimmedEmail) {
      toast.error('Full name and email cannot be empty');
      return;
    }

    try {
      setActioningUserId(editingUser.id);
      await updateAdminUser(editingUser.id, {
        fullName: trimmedFullName,
        email: trimmedEmail,
      });

      toast.success('User updated successfully');
      setEditingUser(null);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update user');
      console.error(error);
    } finally {
      setActioningUserId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      setActioningUserId(deleteUser.id);
      await deleteAdminUser(deleteUser.id);
      toast.success('User deleted successfully');
      setDeleteUser(null);
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error(error);
    } finally {
      setActioningUserId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading users...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.fullName}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={user.role}
                  onChange={(e) => handleChangeRole(user.id, e.target.value)}
                  disabled={actioningUserId === user.id}
                  className="text-sm px-2 py-1 border border-gray-300 rounded-md bg-white"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.active ? 'Active' : 'Locked'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="relative inline-block" data-user-menu>
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                    disabled={actioningUserId === user.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Open actions for ${user.email}`}
                    title="Actions"
                  >
                    <MoreHorizontal size={17} />
                  </button>

                  {openMenuId === user.id && (
                    <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          openEditDialog(user);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setDeleteUser(user);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>

                      <div className="border-t border-gray-200" />

                      {user.active ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleLockUser(user.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          <Lock size={14} />
                          Lock
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleUnlockUser(user.id);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          <Unlock size={14} />
                          Unlock
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">No users found</div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit user</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((current) => ({ ...current, fullName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((current) => ({ ...current, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditUser}
                disabled={actioningUserId === editingUser.id}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actioningUserId === editingUser.id ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete user</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mb-2 text-sm text-slate-700">
              Delete <span className="font-semibold text-slate-900">{deleteUser.email}</span> from the system?
            </p>
            <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              This will also remove the user&apos;s wallets and transactions.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actioningUserId === deleteUser.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actioningUserId === deleteUser.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
