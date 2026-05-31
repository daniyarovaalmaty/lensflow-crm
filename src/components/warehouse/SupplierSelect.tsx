'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, X, Loader2, Check } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  inn: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
}

interface SupplierSelectProps {
  /** Currently selected supplier id */
  value: string;
  /** Called with selected supplier id */
  onChange: (supplierId: string) => void;
  /** Placeholder text */
  placeholder?: string;
}

export default function SupplierSelect({ value, onChange, placeholder = 'Выберите поставщика...' }: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // New supplier form state
  const [newName, setNewName] = useState('');
  const [newInn, setNewInn] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
        resetForm();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load suppliers on mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const res = await fetch('/api/optic/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setNewName('');
    setNewInn('');
    setNewPhone('');
    setFormError('');
    setShowNewForm(false);
  }

  async function handleCreateSupplier() {
    if (!newName.trim()) {
      setFormError('Название обязательно');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/optic/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, inn: newInn, phone: newPhone }),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || 'Ошибка сохранения');
        return;
      }
      const created: Supplier = await res.json();
      setSuppliers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id);
      setOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  const selected = suppliers.find(s => s.id === value);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open) setShowNewForm(false); }}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors bg-white"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium text-gray-900">{selected.name}</span>
            {selected.inn && <span className="text-gray-400 text-xs shrink-0">ИИН: {selected.inn}</span>}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="text-gray-300 hover:text-gray-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

          {/* Existing suppliers list */}
          {!showNewForm && (
            <>
              <div className="max-h-52 overflow-y-auto">
                {suppliers.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-400 text-center">Нет поставщиков</div>
                ) : suppliers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onChange(s.id); setOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center justify-between gap-2 transition-colors ${
                      value === s.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                      {(s.inn || s.phone) && (
                        <div className="text-[11px] text-gray-400 truncate">
                          {[s.inn && `ИИН: ${s.inn}`, s.phone].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                    {value === s.id && <Check className="w-4 h-4 text-primary-500 shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Add new supplier button */}
              <div className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  + Новый поставщик
                </button>
              </div>
            </>
          )}

          {/* Inline new supplier form */}
          {showNewForm && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-800">Новый поставщик</span>
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); resetForm(); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ООО Поставщик..."
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateSupplier(); }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ИИН/БИН</label>
                <input
                  type="text"
                  value={newInn}
                  onChange={e => setNewInn(e.target.value)}
                  placeholder="123456789012"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="+7 (700) 000-00-00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600">{formError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); resetForm(); }}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleCreateSupplier}
                  disabled={saving || !newName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
