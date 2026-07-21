'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Plus, X, Trash2, BookTemplate } from 'lucide-react';

interface Template {
    id: string;
    title: string;
    text: string;
    category: string;
}

interface MedicalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    category: string; // e.g., 'complaints', 'anamnesis_life'
    label?: string;
    onValueChange?: (value: string) => void;
    quickTags?: string[];
}

export default function MedicalTextarea({ category, label, value, onValueChange, className = '', quickTags, ...props }: MedicalTextareaProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && templates.length === 0) {
            fetchTemplates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        // Close popover when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsSaving(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`/api/optic/templates?category=${category}`);
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Failed to fetch templates', error);
        }
    };

    const handleApplyTemplate = (text: string) => {
        const currentValue = (value || '').toString();
        const newValue = currentValue ? `${currentValue}\n${text}` : text;
        
        if (onValueChange) {
            onValueChange(newValue);
        } else if (props.onChange) {
            // Mock event for standard onChange
            const e = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
            props.onChange(e);
        }
        setIsOpen(false);
    };

    const handleSaveTemplate = async () => {
        const textToSave = (value || '').toString().trim();
        if (!textToSave || !newTitle.trim()) return;

        try {
            const res = await fetch('/api/optic/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, title: newTitle.trim(), text: textToSave })
            });

            if (res.ok) {
                const newTpl = await res.json();
                setTemplates([newTpl, ...templates]);
                setIsSaving(false);
                setNewTitle('');
            }
        } catch (error) {
            console.error('Failed to save template', error);
        }
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Удалить этот шаблон?')) return;

        try {
            const res = await fetch(`/api/optic/templates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTemplates(templates.filter(t => t.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete template', error);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {label && (
                <div className="flex justify-between items-end mb-1">
                    <label className="block text-xs font-semibold text-gray-500">{label}</label>
                </div>
            )}
            <div className="relative">
                {quickTags && quickTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {quickTags.map((tag, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleApplyTemplate(tag)}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] rounded-full border border-indigo-100 transition-colors"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
                <textarea
                    value={value}
                    onChange={(e) => onValueChange ? onValueChange(e.target.value) : props.onChange?.(e)}
                    className={`w-full resize-none pr-8 ${className}`}
                    {...props}
                />
                
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-indigo-600 transition-colors bg-white rounded-md z-10"
                    title="Шаблоны"
                >
                    <Bookmark className="w-4 h-4" />
                </button>

                {isOpen && (
                    <div className="absolute top-8 right-0 w-72 bg-white border border-gray-200 shadow-xl rounded-lg z-50 overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Шаблоны ({templates.length})</span>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                            {templates.length === 0 && !isSaving && (
                                <p className="text-xs text-gray-500 text-center py-4">Нет сохраненных шаблонов</p>
                            )}
                            
                            {templates.map(tpl => (
                                <div 
                                    key={tpl.id}
                                    onClick={() => handleApplyTemplate(tpl.text)}
                                    className="p-2 hover:bg-indigo-50 rounded cursor-pointer group flex justify-between items-start"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{tpl.title}</p>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{tpl.text}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-2 border-t border-gray-100 bg-gray-50">
                            {isSaving ? (
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Название шаблона..." 
                                        className="w-full text-sm border-gray-300 rounded p-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={handleSaveTemplate}
                                            disabled={!newTitle.trim() || !value}
                                            className="flex-1 bg-indigo-600 text-white text-xs py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            Сохранить
                                        </button>
                                        <button 
                                            onClick={() => setIsSaving(false)}
                                            className="flex-1 bg-gray-200 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-300"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsSaving(true)}
                                    disabled={!value || value.toString().trim() === ''}
                                    className="w-full flex items-center justify-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 py-1.5 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>Сохранить текущий текст</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
