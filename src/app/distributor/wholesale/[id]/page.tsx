'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Box, CheckCircle2, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function WholesaleOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/distributor/wholesale/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data);
                } else {
                    toast.error('Заказ не найден');
                    router.push('/distributor/wholesale');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [params.id, router]);

    const handleReserve = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/distributor/wholesale/${params.id}/reserve`, { method: 'POST' });
            if (res.ok) {
                const updated = await res.json();
                setOrder(updated);
                toast.success('Товар успешно зарезервирован');
            } else {
                const err = await res.text();
                toast.error(err || 'Ошибка резервирования');
            }
        } catch (error) {
            toast.error('Ошибка сети');
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/distributor/wholesale/${params.id}/complete`, { method: 'POST' });
            if (res.ok) {
                const updated = await res.json();
                setOrder(updated);
                toast.success('Заказ успешно отгружен');
            } else {
                const err = await res.text();
                toast.error(err || 'Ошибка отгрузки');
            }
        } catch (error) {
            toast.error('Ошибка сети');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Загрузка...</div>;
    if (!order) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/distributor/wholesale">
                    <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <h1 className="text-2xl font-bold">Заказ {order.orderNumber}</h1>
                
                {order.status === 'draft' && <Badge variant="outline" className="text-lg py-1 px-3">Черновик</Badge>}
                {order.status === 'reserved' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-lg py-1 px-3">В резерве</Badge>}
                {order.status === 'completed' && <Badge className="bg-green-100 text-green-800 border-green-300 text-lg py-1 px-3">Отгружен</Badge>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border rounded-lg p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Состав заказа</h2>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Наименование</TableHead>
                                    <TableHead>Кол-во</TableHead>
                                    <TableHead>Цена</TableHead>
                                    <TableHead>Сумма</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.items.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.product?.name || 'Неизвестный товар'}</TableCell>
                                        <TableCell>{item.quantity} шт</TableCell>
                                        <TableCell>{item.price.toLocaleString('ru-RU')} ₸</TableCell>
                                        <TableCell className="font-semibold">{item.total.toLocaleString('ru-RU')} ₸</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex justify-end mt-4 text-xl font-bold">
                            Итого: {order.totalAmount.toLocaleString('ru-RU')} ₸
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold">Информация</h2>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Контрагент</p>
                            <p className="font-medium">{order.counterparty?.name || 'Не указан'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Комментарий</p>
                            <p>{order.notes || '—'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Дата создания</p>
                            <p>{new Date(order.createdAt).toLocaleString('ru-RU')}</p>
                        </div>
                    </div>

                    <div className="bg-white border rounded-lg p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold">Действия</h2>
                        
                        {order.status === 'draft' && (
                            <Button 
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" 
                                size="lg"
                                onClick={handleReserve}
                                disabled={actionLoading}
                            >
                                <Box className="w-4 h-4 mr-2" />
                                Зарезервировать на складе
                            </Button>
                        )}

                        {order.status === 'reserved' && (
                            <Button 
                                className="w-full bg-green-600 hover:bg-green-700 text-white" 
                                size="lg"
                                onClick={handleComplete}
                                disabled={actionLoading}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Отгрузить (Продать)
                            </Button>
                        )}

                        {order.status === 'completed' && (
                            <Button className="w-full" variant="outline" size="lg">
                                <Printer className="w-4 h-4 mr-2" />
                                Печать накладной
                            </Button>
                        )}
                        
                        <Button className="w-full" variant="ghost" size="lg">
                            <FileText className="w-4 h-4 mr-2" />
                            Скачать счет на оплату
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
