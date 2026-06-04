'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import QuickNav from '@/components/ui/QuickNav';
import {
  User, Lock, Building2, Bell, Shield, LogOut,
  Eye, EyeOff, Check, AlertCircle, Loader2, ChevronRight,
  Mail, Phone, MapPin, Globe, Save,
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const subRole = (session?.user as any)?.subRole;
  const isProcurement = subRole === 'optic_procurement';

  // Profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Org info
  const [orgInfo, setOrgInfo] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'org'>('profile');

  useEffect(() => {
    if (session?.user) {
      setEmail((session.user as any).email || '');
    }
    // Always load name + phone fresh from DB (JWT may be stale)
    fetch('/api/user/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.fullName) setName(data.fullName);
        if (data?.phone) setPhone(data.phone);
      })
      .catch(() => {});
  }, [session]);


  useEffect(() => {
    fetch('/api/organizations/branches')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.length > 0) setOrgInfo(data);
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (res.ok) {
        await update({ name: name.trim() });
        setProfileMsg({ type: 'ok', text: 'Профиль обновлён' });
      } else {
        const d = await res.json();
        setProfileMsg({ type: 'err', text: d.error || 'Ошибка сохранения' });
      }
    } catch {
      setProfileMsg({ type: 'err', text: 'Нет связи с сервером' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPass || !newPass || newPass !== confirmPass) {
      setPassMsg({ type: 'err', text: newPass !== confirmPass ? 'Пароли не совпадают' : 'Заполните все поля' });
      return;
    }
    if (newPass.length < 6) {
      setPassMsg({ type: 'err', text: 'Новый пароль должен быть не менее 6 символов' });
      return;
    }
    setChangingPass(true);
    setPassMsg(null);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      if (res.ok) {
        setPassMsg({ type: 'ok', text: 'Пароль успешно изменён' });
        setCurrentPass(''); setNewPass(''); setConfirmPass('');
      } else {
        const d = await res.json();
        setPassMsg({ type: 'err', text: d.error || 'Неверный текущий пароль' });
      }
    } catch {
      setPassMsg({ type: 'err', text: 'Нет связи с сервером' });
    } finally {
      setChangingPass(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Профиль', icon: User },
    { id: 'password' as const, label: 'Пароль', icon: Lock },
    { id: 'org' as const, label: 'Организация', icon: Building2 },
  ];

  const orgName = (session?.user as any)?.organizationName || 'Оптика Народная';

  return (
    <div className="min-h-screen bg-gray-50">
      <QuickNav />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Настройки</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление профилем и параметрами аккаунта</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">

          {/* Sidebar nav */}
          <div className="space-y-1">
            {/* User card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-white font-bold">
                  {(name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900 truncate">{name || '—'}</div>
              <div className="text-xs text-gray-400 truncate mt-0.5">{email}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 rounded-full text-xs font-medium text-violet-700">
                <Shield className="w-3 h-3" />
                {isProcurement ? 'Отдел закупа' : 'Сотрудник'}
              </div>
            </div>

            {/* Tab buttons */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-violet-50 text-violet-700 border-l-2 border-violet-500'
                      : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut className="w-4 h-4" />
              Выйти из аккаунта
            </button>
          </div>

          {/* Main content */}
          <div>
            {/* ─── Profile tab ─── */}
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <User className="w-4 h-4 text-violet-500" /> Личные данные
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Полное имя</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Имя Фамилия Отчество"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email нельзя изменить самостоятельно</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> Телефон (необязательно)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+7 (XXX) XXX-XX-XX"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                    />
                  </div>

                  {profileMsg && (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                      profileMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {profileMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {profileMsg.text}
                    </div>
                  )}

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !name.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Сохранить изменения
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── Password tab ─── */}
            {activeTab === 'password' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-violet-500" /> Изменение пароля
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Текущий пароль</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPass}
                        onChange={e => setCurrentPass(e.target.value)}
                        placeholder="Введите текущий пароль"
                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                      <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Новый пароль</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        placeholder="Минимум 6 символов"
                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                      <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPass.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                            newPass.length >= [4, 6, 8, 12][i]
                              ? ['bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][i]
                              : 'bg-gray-200'
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Подтверждение пароля</label>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={e => setConfirmPass(e.target.value)}
                      placeholder="Повторите новый пароль"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 ${
                        confirmPass && confirmPass !== newPass ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {confirmPass && confirmPass !== newPass && (
                      <p className="text-xs text-red-500 mt-1">Пароли не совпадают</p>
                    )}
                  </div>

                  {passMsg && (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                      passMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {passMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {passMsg.text}
                    </div>
                  )}

                  <button
                    onClick={handleChangePassword}
                    disabled={changingPass || !currentPass || !newPass || !confirmPass}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    {changingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Изменить пароль
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── Org tab ─── */}
            {activeTab === 'org' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-violet-500" /> Информация об организации
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        ОН
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">Оптика Народная</div>
                        <div className="text-sm text-gray-500 mt-0.5">Сеть оптических салонов</div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-xs text-gray-400 font-medium uppercase mb-1">Ваша роль</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {isProcurement ? 'Отдел закупа' : 'Сотрудник'}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="text-xs text-gray-400 font-medium uppercase mb-1">Доступ</div>
                        <div className="text-sm font-semibold text-gray-800">Все филиалы</div>
                      </div>
                    </div>

                    {/* Branch list */}
                    {orgInfo && orgInfo.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-3">Филиалы сети</div>
                        <div className="space-y-2">
                          {orgInfo.map((branch: any) => {
                            const isLab = (branch.recipientType || 'laboratory') === 'laboratory';
                            return (
                              <div key={branch.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-violet-200 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-sm">🏪</div>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-800">{branch.name}</div>
                                    <div className={`text-xs mt-0.5 flex items-center gap-1 ${isLab ? 'text-blue-600' : 'text-orange-600'}`}>
                                      {isLab ? '🔬 Лаборатория' : '🚚 ЦКК Дистрибьютор'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">авто-маршрут</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price list info */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-violet-500" /> Актуальный прайс-лист
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Тип линзы</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">DK 100</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">DK 125</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">DK 180</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[
                          { name: 'Сферическая', dk100: 25000, dk125: 28000, dk180: 31000, color: 'text-blue-600' },
                          { name: 'Торическая', dk100: 30000, dk125: 33000, dk180: 36000, color: 'text-violet-600' },
                        ].map(row => (
                          <tr key={row.name}>
                            <td className={`py-3 pr-4 font-medium ${row.color}`}>{row.name}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{row.dk100.toLocaleString('ru-RU')} ₸</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{row.dk125.toLocaleString('ru-RU')} ₸</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-800">{row.dk180.toLocaleString('ru-RU')} ₸</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="py-3 pr-4 font-medium text-gray-500">Пробная DK 50</td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-800">12 000 ₸</td>
                          <td className="py-3 px-3 text-right text-gray-300">—</td>
                          <td className="py-3 px-3 text-right text-gray-300">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Цены указаны за 1 линзу, в тенге (₸)</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
