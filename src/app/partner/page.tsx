'use client';

import { useState } from 'react';
import { CheckCircle, Send, Eye, Clock, Users, TrendingUp, Phone, Mail, MapPin, Building2 } from 'lucide-react';

export default function PartnerLandingPage() {
    const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', clinicName: '', message: '' });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.phone) { setError('Заполните имя и телефон'); return; }
        setSending(true);
        setError('');
        try {
            const res = await fetch('/api/partner-leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) { setSent(true); }
            else { setError('Ошибка отправки, попробуйте снова'); }
        } catch { setError('Нет соединения'); }
        finally { setSending(false); }
    };

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            {/* Hero */}
            <div style={{ padding: '60px 24px 40px', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
                <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1.5, background: 'rgba(20,184,166,.15)', color: '#14b8a6', border: '1px solid rgba(20,184,166,.3)', marginBottom: 20 }}>
                    MedInvision Lab × LensFlow
                </div>
                <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, lineHeight: 1.15, color: '#14b8a6', marginBottom: 12 }}>
                    Начните зарабатывать<br />на ночных линзах
                </h1>
                <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#94a3b8', lineHeight: 1.6 }}>
                    Производство за 2 часа • Обучение подбору • CRM-экосистема
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, maxWidth: 600, margin: '0 auto 32px', padding: '0 24px' }}>
                {[
                    { icon: <Clock size={20} />, num: '2 ч', label: 'изготовление' },
                    { icon: <Eye size={20} />, num: '20 000+', label: 'линз' },
                    { icon: <Users size={20} />, num: '200+', label: 'клиник' },
                    { icon: <TrendingUp size={20} />, num: '170K ₸', label: 'прибыль/пац.' },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '18px 12px', textAlign: 'center' }}>
                        <div style={{ color: '#14b8a6', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#14b8a6' }}>{s.num}</div>
                        <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* What you get */}
            <div style={{ maxWidth: 600, margin: '0 auto 32px', padding: '0 24px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e2e8f0', textAlign: 'center', marginBottom: 16 }}>Что вы получаете</h2>
                {[
                    'Обучение подбору ночных линз (3 дня)',
                    'Помощь с оборудованием',
                    'LensFlow CRM — 3 месяца бесплатно',
                    'Производство линз за 2 часа',
                    'Бесплатные ремейки',
                    'Маркетинговые материалы',
                    'Персональный менеджер 24/7',
                ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: '.95rem', color: '#cbd5e1' }}>
                        <CheckCircle size={18} color="#14b8a6" style={{ flexShrink: 0 }} />
                        {item}
                    </div>
                ))}
            </div>

            {/* Form */}
            <div style={{ maxWidth: 500, margin: '0 auto', padding: '0 24px 60px' }}>
                <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 28 }}>
                    {sent ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <CheckCircle size={56} color="#14b8a6" style={{ margin: '0 auto 12px' }} />
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Заявка отправлена!</h2>
                            <p style={{ color: '#94a3b8', fontSize: '.95rem' }}>Мы свяжемся с вами в ближайшее время</p>
                        </div>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e2e8f0', textAlign: 'center', marginBottom: 20 }}>
                                Оставьте заявку
                            </h2>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ position: 'relative' }}>
                                    <Users size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#475569' }} />
                                    <input placeholder="Ваше имя *" value={form.name} onChange={e => set('name', e.target.value)}
                                        style={inputStyle} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#475569' }} />
                                    <input placeholder="Телефон *" value={form.phone} onChange={e => set('phone', e.target.value)}
                                        style={inputStyle} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#475569' }} />
                                    <input placeholder="Email" value={form.email} onChange={e => set('email', e.target.value)}
                                        style={inputStyle} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#475569' }} />
                                    <input placeholder="Город" value={form.city} onChange={e => set('city', e.target.value)}
                                        style={inputStyle} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Building2 size={16} style={{ position: 'absolute', left: 14, top: 14, color: '#475569' }} />
                                    <input placeholder="Название клиники / оптики" value={form.clinicName} onChange={e => set('clinicName', e.target.value)}
                                        style={inputStyle} />
                                </div>
                                <textarea placeholder="Комментарий (необязательно)" value={form.message} onChange={e => set('message', e.target.value)}
                                    rows={3} style={{ ...inputStyle, paddingLeft: 14, resize: 'vertical' as const }} />

                                {error && <p style={{ color: '#ef4444', fontSize: '.85rem', textAlign: 'center' }}>{error}</p>}

                                <button type="submit" disabled={sending}
                                    style={{ width: '100%', padding: '14px', background: '#14b8a6', color: '#0a0f1e', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending ? .6 : 1 }}>
                                    <Send size={18} />
                                    {sending ? 'Отправка...' : 'Отправить заявку'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
                <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.8rem', color: '#475569' }}>
                    MedInvision Lab × LensFlow • lensflow.kz • +7 777 296 26 08
                </p>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px 12px 40px',
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 12,
    color: '#e2e8f0',
    fontSize: '.95rem',
    outline: 'none',
};
