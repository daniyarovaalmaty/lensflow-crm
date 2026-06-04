'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Search, ChevronDown, ChevronUp,
  Building2, Calendar, CreditCard, CheckCircle2, Clock, XCircle,
  Truck, Eye, TrendingUp, Package, RefreshCw, Paperclip, Download, Upload, Trash2, FileText
} from 'lucide-react';
import QuickNav from '@/components/ui/QuickNav';
import { generateInvoicePdf } from '@/lib/generateInvoicePdf';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  in_production: 'В производстве',
  quality_check: 'Контроль качества',
  ready: 'Готов',
  shipped: 'Отправлен',
  out_for_delivery: 'У курьера',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_production: 'bg-indigo-100 text-indigo-700',
  quality_check: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  shipped: 'bg-amber-100 text-amber-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, any> = {
  new: Clock,
  in_production: Package,
  quality_check: Eye,
  ready: CheckCircle2,
  shipped: Truck,
  out_for_delivery: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Не оплачен',
  partial: 'Частично',
  paid: 'Оплачен',
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: 'text-red-600',
  partial: 'text-amber-600',
  paid: 'text-emerald-600',
};

export default function ProcurementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderDocs, setOrderDocs] = useState<Record<string, Array<{ index: number; name: string; mimeType: string; size: number; uploadedAt: string; uploadedBy: string }>>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const handleFileUpload = async (orderId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingDoc(orderId);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          alert(`Файл "${file.name}" превышает 5 МБ. Пропущен.`);
          continue;
        }
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await fetch(`/api/orders/${orderId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            data: base64,
            mimeType: file.type,
            size: file.size,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          alert(`Ошибка загрузки "${file.name}": ${err.error || res.statusText}`);
        }
      }
      await loadDocs(orderId);
    } catch (e) {
      alert('Ошибка при загрузке файла');
      console.error('Upload error:', e);
    } finally {
      setUploadingDoc(null);
    }
  };

  const deleteDoc = async (orderId: string, index: number) => {
    await fetch(`/api/orders/${orderId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index }),
    });
    await loadDocs(orderId);
  };

  const loadDocs = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/documents`);
      if (res.ok) {
        const docs = await res.json();
        setOrderDocs(prev => ({ ...prev, [orderId]: docs }));
      } else {
        setOrderDocs(prev => ({ ...prev, [orderId]: [] }));
      }
    } catch (e) {
      console.error('Load docs error:', e);
      setOrderDocs(prev => ({ ...prev, [orderId]: [] }));
    }
  };

  const downloadDoc = async (orderId: string, index: number, fileName: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/documents?download=${index}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  useEffect(() => {
    if (expandedId && !orderDocs[expandedId]) {
      loadDocs(expandedId);
    }
  }, [expandedId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const orgRes = await fetch('/api/organizations/branches');
      if (orgRes.ok) setBranches(await orgRes.json());
      const ordRes = await fetch('/api/orders?all=true');
      if (ordRes.ok) {
        const data = await ordRes.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (o.order_id || '').toLowerCase().includes(q) ||
        (o.patient?.name || '').toLowerCase().includes(q) ||
        (o.meta?.optic_name || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchBranch = !branchFilter || o.meta?.optic_id === branchFilter;
      return matchSearch && matchStatus && matchBranch;
    });
  }, [orders, search, statusFilter, branchFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
    const totalAmount = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const paidAmount = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total_price || 0), 0);
    return { total, active, totalAmount, paidAmount };
  }, [orders]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation — same as optic doctors/managers */}
      <QuickNav />

      {/* Page action bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-800">Все заказы</h1>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/optic/orders/new')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Новый заказ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Всего заказов', value: stats.total, icon: Package, color: 'from-blue-500 to-blue-600' },
            { label: 'Активных', value: stats.active, icon: Clock, color: 'from-violet-500 to-purple-600' },
            { label: 'Сумма заказов', value: stats.totalAmount.toLocaleString('ru-RU') + ' ₸', icon: TrendingUp, color: 'from-emerald-500 to-green-600' },
            { label: 'Оплачено', value: stats.paidAmount.toLocaleString('ru-RU') + ' ₸', icon: CreditCard, color: 'from-amber-500 to-orange-500' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по номеру, пациенту, филиалу..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            >
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            >
              <option value="">Все филиалы</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Заказов пока нет</p>
            <p className="text-sm text-gray-400 mt-1">Создайте первый заказ, нажав кнопку выше</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 font-medium">Найдено: {filtered.length} заказов</p>
            <AnimatePresence>
              {filtered.map((order, i) => {
                const StatusIcon = STATUS_ICONS[order.status] || Clock;
                const isExpanded = expandedId === order.id;
                const od = order.config?.eyes?.od;
                const os = order.config?.eyes?.os;

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Main row */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full text-left p-4 sm:p-5 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <StatusIcon className="w-4 h-4 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">#{order.order_id}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABELS[order.status] || order.status}
                              </span>
                              {order.is_urgent && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⚡ Срочный</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {order.meta?.optic_name || 'Филиал не указан'}
                              </span>
                              {order.patient?.name && (
                                <span>👤 {order.patient.name}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(order.meta?.created_at).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-gray-900 text-sm">
                            {(order.total_price || 0).toLocaleString('ru-RU')} ₸
                          </div>
                          <div className={`text-xs font-medium mt-0.5 ${PAYMENT_COLORS[order.payment_status] || 'text-gray-500'}`}>
                            {PAYMENT_LABELS[order.payment_status] || '—'}
                          </div>
                          <div className="mt-1">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                              : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                            }
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-gray-100"
                        >
                          <div className="p-4 sm:p-5 bg-gray-50/50 space-y-4">
                            {/* Lens params */}
                            <div className="grid sm:grid-cols-2 gap-3">
                              {[{ label: 'OD (правый)', eye: od }, { label: 'OS (левый)', eye: os }].map(({ label, eye }) =>
                                eye && Number(eye.qty) > 0 ? (
                                  <div key={label} className="bg-white rounded-xl p-3 border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">{label}</p>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      {[
                                        ['Km', eye.km], ['DIA', eye.dia], ['Dk', eye.dk],
                                        ['TP', eye.tp], ['E', eye.e1 != null ? `${eye.e1}${eye.e2 != null ? '/' + eye.e2 : ''}` : '—'],
                                        ['Тор.', eye.tor ?? '—'],
                                      ].map(([k, v]) => (
                                        <div key={String(k)}>
                                          <span className="text-gray-400">{k}: </span>
                                          <span className="font-semibold text-gray-800">{v ?? '—'}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {eye.color && (
                                      <div className="mt-2 text-xs">
                                        <span className="text-gray-400">Цвет: </span>
                                        <span className="font-semibold text-gray-800">{eye.color}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : null
                              )}
                            </div>

                            {/* Finance row */}
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-gray-500 uppercase">Финансы</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateInvoicePdf(order);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Счет на оплату (PDF)
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-500">
                                    Итого: <span className="font-bold text-gray-900">{(order.total_price || 0).toLocaleString('ru-RU')} ₸</span>
                                  </div>
                                  {order.paid_amount > 0 && (
                                    <div className="text-xs text-gray-500">
                                      Оплачено: <span className="font-bold text-emerald-600">{order.paid_amount.toLocaleString('ru-RU')} ₸</span>
                                    </div>
                                  )}
                                  {order.discount_percent > 0 && (
                                    <div className="text-xs text-emerald-600">
                                      Скидка: {order.discount_percent}%
                                    </div>
                                  )}
                                </div>
                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                order.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {PAYMENT_LABELS[order.payment_status] || '—'}
                              </span>
                            </div>

                            {/* Closing documents list */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-gray-500 uppercase">Закрывающие документы</p>
                                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                                  <Upload className="w-3.5 h-3.5" />
                                  {uploadingDoc === order.order_id ? 'Загрузка...' : 'Загрузить'}
                                  <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    disabled={uploadingDoc === order.order_id}
                                    onChange={e => handleFileUpload(order.order_id, e.target.files)}
                                  />
                                </label>
                              </div>
                              {(() => {
                                const docs = orderDocs[order.order_id];
                                if (!docs) {
                                  return <p className="text-xs text-gray-400">Загрузка...</p>;
                                }
                                if (docs.length === 0) {
                                  return <p className="text-xs text-gray-400">Нет загруженных документов</p>;
                                }
                                return (
                                  <div className="space-y-2 mt-2">
                                    {docs.map((doc, i) => (
                                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                                        <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-800 truncate">{doc.name}</p>
                                          <p className="text-[10px] text-gray-500">
                                            {(doc.size / 1024).toFixed(1)} KB · {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => downloadDoc(order.order_id, doc.index, doc.name)}
                                          className="text-violet-600 hover:text-violet-700 p-1.5 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors"
                                          title="Скачать"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => deleteDoc(order.order_id, doc.index)}
                                          className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                          title="Удалить"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                            {/* Notes */}
                            {order.notes && (
                              <div className="bg-white rounded-xl p-3 border border-gray-100 text-xs text-gray-600">
                                <span className="font-semibold text-gray-500">Примечание: </span>{order.notes}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
