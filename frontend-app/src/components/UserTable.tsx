import type { UserDTO } from '../services/api';
import { lockAdminUser, unlockAdminUser, changeAdminUserRole } from '../services/api';
import { Button } from './Button';
import { useState } from 'react';
import { toast } from '../services/notifications';

interface UserTableProps {
  users: UserDTO[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function UserTable({ users, isLoading, onRefresh }: UserTableProps) {
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

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
              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                {user.active ? (
                  <Button
                    onClick={() => handleLockUser(user.id)}
                    disabled={actioningUserId === user.id}
                    variant="secondary"
                    size="sm"
                  >
                    Lock
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUnlockUser(user.id)}
                    disabled={actioningUserId === user.id}
                    variant="secondary"
                    size="sm"
                  >
                    Unlock
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">No users found</div>
      )}
    </div>
  );
}
