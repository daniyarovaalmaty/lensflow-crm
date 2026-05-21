'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Phone, MapPin, Building2, MessageSquare, Calendar, RefreshCw } from 'lucide-react';

interface PartnerLead {
    id: string;
    name: string;
    phone: string;
    city: string | null;
    notes: string | null;
    tags: string[];
    createdAt: string;
    stage: string;
}

export default function PartnerLeadsPage() {
    const [leads, setLeads] = useState<PartnerLead[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/partner-leads');
            if (res.ok) setLeads(await res.json());
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchLeads(); }, []);

    const parseNotes = (notes: string | null) => {
        if (!notes) return { clinicName: '', message: '' };
        const clinic = notes.match(/Клиника: (.+)/)?.[1] || '';
        const msg = notes.match(/Сообщение: (.+)/)?.[1] || '';
        return { clinicName: clinic, message: msg };
    };

    const formatDate = (d: string) => new Date(d).toLocaleString('ru-RU', {
        timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    return (
        <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserPlus size={24} /> Заявки партнёров
                    </h1>
                    <p style={{ fontSize: '.85rem', color: '#64748b', marginTop: 4 }}>
                        Заявки с лендинга lensflow-crm.vercel.app/partner
                    </p>
                </div>
                <button onClick={fetchLeads} disabled={loading}
                    style={{ padding: '8px 16px', background: '#14b8a6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', fontWeight: 600 }}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Обновить
                </button>
            </div>

            {leads.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <UserPlus size={48} style={{ opacity: .3, marginBottom: 12 }} />
                    <p>Заявок пока нет</p>
                    <p style={{ fontSize: '.8rem', marginTop: 4 }}>Они появятся здесь, когда кто-то заполнит форму на лендинге</p>
                </div>
            )}

            {loading && leads.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Загрузка...</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {leads.map(lead => {
                    const { clinicName, message } = parseNotes(lead.notes);
                    return (
                        <div key={lead.id} style={{
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                            padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>{lead.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#14b8a6', fontSize: '.9rem' }}>
                                        <Phone size={14} />
                                        <a href={`tel:${lead.phone}`} style={{ color: '#14b8a6', textDecoration: 'none' }}>{lead.phone}</a>
                                        <span style={{ margin: '0 4px', color: '#cbd5e1' }}>•</span>
                                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank"
                                            style={{ color: '#25d366', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none' }}>
                                            WhatsApp ↗
                                        </a>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: '.75rem' }}>
                                    <Calendar size={12} />
                                    {formatDate(lead.createdAt)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.85rem', color: '#64748b' }}>
                                {lead.city && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MapPin size={13} /> {lead.city}
                                    </span>
                                )}
                                {clinicName && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Building2 size={13} /> {clinicName}
                                    </span>
                                )}
                                {message && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MessageSquare size={13} /> {message}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: '.8rem', color: '#94a3b8' }}>
                Всего заявок: {leads.length}
            </div>
        </div>
    );
}
