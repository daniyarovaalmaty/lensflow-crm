'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Order {
    id: string;
    orderNumber: string;
    counterparty: { name: string } | null;
    status: string;
    totalAmount: number;
    createdAt: string;
}

export default function WholesaleOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/distributor/wholesale');
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data.orders);
                }
            } catch (error) {
                console.error('Failed to fetch orders', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <Badge variant="outline">Черновик</Badge>;
            case 'reserved': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">Резерв</Badge>;
            case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">Отгружен</Badge>;
            case 'cancelled': return <Badge variant="destructive">Отменен</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Оптовые заказы (B2B)</h1>
                <Link href="/distributor/wholesale/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Создать заказ
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Номер</TableHead>
                            <TableHead>Дата</TableHead>
                            <TableHead>Контрагент (Оптика)</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead className="text-right">Сумма</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell>
                            </TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Нет заказов</TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <Link href={`/distributor/wholesale/${order.id}`} className="text-blue-600 hover:underline font-medium">
                                            {order.orderNumber}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}</TableCell>
                                    <TableCell>{order.counterparty?.name || '—'}</TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {order.totalAmount.toLocaleString('ru-RU')} ₸
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
