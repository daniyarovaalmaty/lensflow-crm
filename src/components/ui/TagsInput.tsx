'use client';

import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X, Bookmark } from 'lucide-react';

interface TagsInputProps {
    label?: string;
    value: string; // Comma-separated or JSON
    onChange: (value: string) => void;
    placeholder?: string;
    category?: string; // For templates
}

export default function TagsInput({ label, value, onChange, placeholder = 'Введите и нажмите Enter...', category }: TagsInputProps) {
    const [inputValue, setInputValue] = useState('');
    
    // Parse value as array of strings. If it looks like JSON array, parse it, otherwise split by comma or newline.
    let tags: string[] = [];
    try {
        if (value && value.trim().startsWith('[')) {
            tags = JSON.parse(value);
        } else if (value) {
            // Split by comma or semicolon or newline, and trim
            tags = value.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
        }
    } catch {
        tags = value ? value.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean) : [];
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = inputValue.trim();
            if (val && !tags.includes(val)) {
                const newTags = [...tags, val];
                onChange(JSON.stringify(newTags));
                setInputValue('');
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            const newTags = tags.slice(0, -1);
            onChange(JSON.stringify(newTags));
        }
    };

    const removeTag = (tagToRemove: string) => {
        const newTags = tags.filter(t => t !== tagToRemove);
        onChange(JSON.stringify(newTags));
    };

    // Popover logic for templates (bookmark)
    const [templates, setTemplates] = useState<{id: string, title: string, text: string}[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && templates.length === 0 && category) {
            fetch(`/api/optic/templates?category=${category}`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setTemplates(data))
                .catch(console.error);
        }
    }, [isOpen, category, templates.length]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyTemplate = (text: string) => {
        if (!tags.includes(text)) {
            onChange(JSON.stringify([...tags, text]));
        }
        setIsOpen(false);
    };

    return (
        <div className="w-full relative" ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
            )}
            <div className="min-h-[42px] p-1.5 bg-white border border-gray-200 rounded-lg focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 flex flex-wrap gap-1.5 items-center pr-8 relative">
                {tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-md border border-indigo-100">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-indigo-400 hover:text-indigo-600 focus:outline-none">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 px-1 py-0.5"
                />
                
                {category && (
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-indigo-600 transition-colors bg-white rounded-md z-10"
                        title="Шаблоны"
                    >
                        <Bookmark className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full mt-1 right-0 w-72 bg-white border border-gray-200 shadow-xl rounded-lg z-50 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Шаблоны ({templates.length})</span>
                        <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {templates.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-4">Нет сохраненных шаблонов</p>
                        ) : (
                            templates.map(tpl => (
                                <div 
                                    key={tpl.id}
                                    onClick={() => applyTemplate(tpl.text)}
                                    className="p-2 hover:bg-indigo-50 rounded cursor-pointer group flex justify-between items-start"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{tpl.title}</p>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{tpl.text}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
