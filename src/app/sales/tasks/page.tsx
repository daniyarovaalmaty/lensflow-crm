'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Clock, Calendar, AlertCircle, CheckCircle2, Phone, ArrowRight, User } from 'lucide-react';

interface Task {
    id: string;
    type: string;
    message: string;
    scheduledAt: string;
    status: string;
    lead: {
        id: string;
        name: string | null;
        phone: string;
        stage: string;
    };
}

function groupTasks(tasks: Task[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const overdue: Task[] = [];
    const forToday: Task[] = [];
    const upcoming: Task[] = [];
    
    tasks.forEach(task => {
        if (task.status === 'completed') return;
        
        const taskDate = new Date(task.scheduledAt);
        const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
        
        if (taskDay < today) {
            overdue.push(task);
        } else if (taskDay.getTime() === today.getTime()) {
            forToday.push(task);
        } else {
            upcoming.push(task);
        }
    });
    
    return { overdue, forToday, upcoming };
}

export default function TasksPage() {
    const { data: session } = useSession();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/crm/tasks?status=pending');
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleComplete = async (taskId: string) => {
        try {
            await fetch('/api/crm/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, status: 'completed' }),
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to complete task', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Загрузка задач...</p>
                </div>
            </div>
        );
    }

    const { overdue, forToday, upcoming } = groupTasks(tasks);

    const TaskCard = ({ task, isOverdue }: { task: Task, isOverdue?: boolean }) => (
        <div className={`bg-white rounded-xl p-4 border ${isOverdue ? 'border-red-200 shadow-sm shadow-red-100' : 'border-gray-200 shadow-sm'} transition-all hover:shadow-md relative group`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                        {isOverdue ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                            {task.lead.name || 'Без имени'}
                        </h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {task.lead.phone.replace('@c.us', '')}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => handleComplete(task.id)}
                    className="p-1.5 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                    title="Выполнить задачу"
                >
                    <CheckCircle2 className="w-5 h-5" />
                </button>
            </div>
            
            <div className="mb-4">
                <p className="text-sm text-gray-700 font-medium">
                    {task.message}
                </p>
                <p className={`text-xs mt-2 font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                    Связаться: {new Date(task.scheduledAt).toLocaleString('ru-RU', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">
                    {task.lead.stage === 'follow_up' ? 'Связаться позже' : task.lead.stage}
                </span>
                <Link 
                    href={`/sales/leads/${task.lead.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                    Открыть карточку <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-7 h-7 text-blue-600" /> Задачи
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Запланированные контакты с лидами</p>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Все задачи выполнены</h3>
                    <p className="text-sm text-gray-500">У вас нет активных задач на данный момент.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Просроченные */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-gray-900">Просроченные</h3>
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {overdue.length}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {overdue.map(task => (
                                <TaskCard key={task.id} task={task} isOverdue={true} />
                            ))}
                            {overdue.length === 0 && (
                                <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    Нет просроченных задач
                                </div>
                            )}
                        </div>
                    </div>

                    {/* На сегодня */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-gray-900">На сегодня</h3>
                            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {forToday.length}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {forToday.map(task => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                            {forToday.length === 0 && (
                                <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    Нет задач на сегодня
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Предстоящие */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-gray-900">Предстоящие</h3>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {upcoming.length}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {upcoming.map(task => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                            {upcoming.length === 0 && (
                                <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    Нет предстоящих задач
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
