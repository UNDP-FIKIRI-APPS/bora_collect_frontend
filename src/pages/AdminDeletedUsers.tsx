import React, { useEffect, useState } from 'react';
import enhancedApiService from '../services/enhancedApiService';

export default function AdminDeletedUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await enhancedApiService.get<any[]>('/users', { skipCache: true });
      setUsers(data.filter((u: any) => u.status === 'DELETED'));
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleReactivate = async (id: string) => {
    setLoading(true);
    try {
      await enhancedApiService.patch(`/users/${id}`, { status: 'ACTIVE' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-6">Utilisateurs supprimés</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {loading && <div>Chargement...</div>}
      <ul className="divide-y">
        {users.map((user) => (
          <li key={user.id} className="py-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={() => handleReactivate(user.id)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              disabled={loading}
            >
              Réactiver
            </button>
          </li>
        ))}
      </ul>
      {!loading && users.length === 0 && (
        <p className="text-gray-500">Aucun utilisateur supprimé.</p>
      )}
    </div>
  );
}
