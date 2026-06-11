import React, { useEffect, useState } from 'react';
import enhancedApiService from '../services/enhancedApiService';

export default function AdminParametres() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [infoMsg, setInfoMsg] = useState('');
  const [infoError, setInfoError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({ old: '', new1: '', new2: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      setForm({ name: parsed.name || '', email: parsed.email || '' });
    }
  }, []);

  // Modifier infos
  const handleInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg(''); setInfoError(''); setSaving(true);
    try {
      const updated = await enhancedApiService.patch<any>('/users/me', form);
      setInfoMsg('Informations mises à jour !');
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (err: any) {
      setInfoError(err.message || 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  // Changer mot de passe
  const handlePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(''); setPwdError(''); setPwdSaving(true);
    if (pwd.new1 !== pwd.new2) {
      setPwdError('Les nouveaux mots de passe ne correspondent pas');
      setPwdSaving(false);
      return;
    }
    try {
      await enhancedApiService.patch('/users/me', { password: pwd.new1 });
      setPwdMsg('Mot de passe modifié !');
      setPwd({ old: '', new1: '', new2: '' });
    } catch (err: any) {
      setPwdError(err.message || 'Erreur inconnue');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-center mb-6">Paramètres du compte Administrateur</h2>
      {/* Infos principales */}
      <form onSubmit={handleInfo} className="mb-8 flex flex-col gap-4">
        <h3 className="text-lg font-bold mb-2">Informations personnelles</h3>
        <div>
          <label className="block font-semibold mb-1">Nom</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded p-2" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded p-2" required />
        </div>
        {infoError && <div className="text-red-600 text-center">{infoError}</div>}
        {infoMsg && <div className="text-green-600 text-center">{infoMsg}</div>}
        <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded shadow self-end" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
      </form>
      {/* Mot de passe */}
      <form onSubmit={handlePwd} className="mb-8 flex flex-col gap-4">
        <h3 className="text-lg font-bold mb-2">Changer le mot de passe</h3>
        <div>
          <label className="block font-semibold mb-1">Nouveau mot de passe</label>
          <input type="password" value={pwd.new1} onChange={e => setPwd(p => ({ ...p, new1: e.target.value }))} className="w-full border rounded p-2" minLength={6} required />
        </div>
        <div>
          <label className="block font-semibold mb-1">Confirmer le nouveau mot de passe</label>
          <input type="password" value={pwd.new2} onChange={e => setPwd(p => ({ ...p, new2: e.target.value }))} className="w-full border rounded p-2" minLength={6} required />
        </div>
        {pwdError && <div className="text-red-600 text-center">{pwdError}</div>}
        {pwdMsg && <div className="text-green-600 text-center">{pwdMsg}</div>}
        <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded shadow self-end" disabled={pwdSaving}>{pwdSaving ? 'Changement...' : 'Changer'}</button>
      </form>
      {/* Photo de profil */}
      <form className="flex flex-col gap-4">
        <h3 className="text-lg font-bold mb-2">Photo de profil</h3>
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold mx-auto" style={{ fontSize: 40 }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        {/* Un seul avatar affiché, suppression de l'image/photoUrl et fallback */}
      </form>
    </div>
  );
} 
