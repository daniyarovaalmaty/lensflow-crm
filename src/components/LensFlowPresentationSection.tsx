"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Scan, Info, X, ChevronRight, ChevronLeft, Shield, MessageSquare, 
  BarChart3, Layers, Settings, Activity, Sparkles, CheckCircle2, Zap 
} from "lucide-react";

export default function LensFlowPresentationSection() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 9;

  // Interactive permission states for Slide 3 simulator
  const [perms, setPerms] = useState({
    pos: true,
    warehouse: true,
    finance: false,
    patients: true
  });

  const togglePerm = (key: keyof typeof perms) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  // Variants for slide transitions
  const slideVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3, ease: "easeIn" } }
  };

  return (
    <section className="py-24 relative overflow-hidden select-none bg-[#0a0a0f] text-slate-200 border-y border-white/5" id="lensflow-presentation">
      {/* Premium Ambient Light Glows */}
      <div className="absolute top-[10%] left-[-15%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#3b82f6]/10 to-[#8b5cf6]/5 blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#10b981]/10 to-[#14b8a6]/5 blur-[130px] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
        
        {/* Presentation Card Wrapper */}
        <div className="bg-[#0f0f15]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 md:p-10 shadow-2xl relative">
          
          {/* Header of presentation box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-extrabold text-lg tracking-tighter">LF</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-none tracking-tight">
                  LensFlow <span className="text-emerald-400 font-normal text-sm">CRM & HUB</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-1.5 tracking-wider uppercase font-semibold">
                  Интерактивная презентация возможностей
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-emerald-400">
                B2B & B2C Экосистема
              </span>
              <span className="text-slate-300 font-mono">{currentSlide} / {totalSlides}</span>
            </div>
          </div>

          {/* Inner presentation container */}
          <div className="min-h-[460px] flex items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              
              {/* Slide 1: Welcome Splash */}
              {currentSlide === 1 && (
                <motion.div 
                  key="slide1"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Инновации в Офтальмологии
                    </div>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                      Экосистема Будущего для{" "}
                      <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-blue-500 bg-clip-text text-transparent">
                        Оптики и Клиник
                      </span>
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg font-light leading-relaxed max-w-xl">
                      LensFlow CRM & MedMundus Hub — это единая цифровая платформа, объединяющая врачебные кабинеты, умные продажи (POS), роботизированный склад, лабораторию заказов и AI-маркетинг.
                    </p>
                    <div className="flex items-center gap-4 pt-4">
                      <button 
                        onClick={nextSlide} 
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition duration-300 transform hover:-translate-y-0.5"
                      >
                        Начать презентацию
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 w-full flex justify-center items-center relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/15 to-transparent blur-3xl rounded-full"></div>
                    <img 
                      src="/images/lensflow_dashboard.png" 
                      className="rounded-3xl border border-white/10 shadow-2xl z-10 max-h-[380px] object-cover" 
                      alt="LensFlow Dashboard" 
                    />
                  </div>
                </motion.div>
              )}

              {/* Slide 2: Vision & Combined Ecosystem */}
              {currentSlide === 2 && (
                <motion.div 
                  key="slide2"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5" /> Наше Видение
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      От единого Пациента к{" "}
                      <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                        Мировому Заказу
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Традиционные решения разделяют клинику, салон оптики и лабораторию по производству линз. **LensFlow** координирует все процессы в едином цифровом поле.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <h4 className="text-teal-400 font-bold text-sm">Клиника & Врачи</h4>
                        <p className="text-xs text-slate-400 mt-1">Офтальмологические карты, рецепты на линзы и история сканирований лица.</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <h4 className="text-purple-400 font-bold text-sm">Склад & POS</h4>
                        <p className="text-xs text-slate-400 mt-1">Умные продажи очков, отслеживание партий и интеграция касс (Kaspi).</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <h4 className="text-emerald-400 font-bold text-sm">Производство (Лаб)</h4>
                        <p className="text-xs text-slate-400 mt-1">Отслеживание бланков линз в реальном времени и автоматический контроль брака.</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <h4 className="text-white font-bold text-sm">WhatsApp AI CRM</h4>
                        <p className="text-xs text-slate-400 mt-1">Автоматическая запись пациентов и догрев лидов в воронке продаж.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full max-w-lg flex flex-col justify-center gap-4">
                    <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 shadow-xl">
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" /> Синхронизация в клике
                      </h3>
                      <div className="space-y-4 text-xs md:text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">1</span>
                          <span className="text-slate-300">Врач выписывает рецепт в MedMundus</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-400 shrink-0">2</span>
                          <span className="text-slate-300">Заказ мгновенно улетает в Лабораторию</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">3</span>
                          <span className="text-slate-300">Склад автоматически списывает заготовки</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Slide 3: Permissions Gating with Live Simulator */}
              {currentSlide === 3 && (
                <motion.div 
                  key="slide3"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5" /> Безопасность & Доступы
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      Гибкие Кабинеты и{" "}
                      <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                        Управление Видимостью
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Руководитель клиники (`optic_manager`) может точечно переопределять права видимости функциональных разделов CRM для врачей и бухгалтеров на уровне базы данных.
                    </p>
                    
                    {/* Interactive Simulator Widget */}
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-4 shadow-xl">
                      <h4 className="text-white text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} /> 
                        Интерактивный симулятор прав сотрудника:
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button 
                          onClick={() => togglePerm('pos')} 
                          className={`px-3 py-2 rounded-xl font-semibold border transition ${perms.pos ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}
                        >
                          🏪 POS Касса
                        </button>
                        <button 
                          onClick={() => togglePerm('warehouse')} 
                          className={`px-3 py-2 rounded-xl font-semibold border transition ${perms.warehouse ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}
                        >
                          📦 Склад
                        </button>
                        <button 
                          onClick={() => togglePerm('finance')} 
                          className={`px-3 py-2 rounded-xl font-semibold border transition ${perms.finance ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}
                        >
                          📊 Аналитика / Финансы
                        </button>
                        <button 
                          onClick={() => togglePerm('patients')} 
                          className={`px-3 py-2 rounded-xl font-semibold border transition ${perms.patients ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}
                        >
                          👥 Пациенты
                        </button>
                      </div>
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Динамическое меню навигации доктора:</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3 text-xs font-semibold">
                          {perms.pos && <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-white/5">🏪 POS продажи</span>}
                          {perms.warehouse && <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-white/5">📦 Склад</span>}
                          {perms.finance && <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-white/5">📊 Аналитика</span>}
                          {perms.patients && <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-white/5">👥 Пациенты</span>}
                          {!perms.pos && !perms.warehouse && !perms.finance && !perms.patients && (
                            <span className="text-red-400 italic flex items-center gap-1">Все разделы скрыты 🔒</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full max-w-md p-6 rounded-3xl bg-slate-950/60 border border-white/10 space-y-4 shadow-2xl">
                    <h3 className="text-white font-bold text-lg">Преимущества системы доступов:</h3>
                    <ul className="space-y-3.5 text-xs md:text-sm text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Гибридное слияние прав:</strong> Автоматическое слияние базовых прав роли со специфическими настройками из БД.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Надежная защита путей:</strong> При прямом переходе на запрещенный модуль доктор видит роскошный экран `AccessDenied`.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Динамический UI:</strong> Вся аналитика выручки скрывается автоматически, если выключен флаг `canViewFinance`.</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* Slide 4: WhatsApp AI Assistant */}
              {currentSlide === 4 && (
                <motion.div 
                  key="slide4"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp AI-Ассистент
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      Роботизированный{" "}
                      <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        Чат-Центр (Inbox)
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Интеграция ИИ с Green API позволяет боту отвечать на частые вопросы пациентов и записывать их на консультации 24/7. Вся история чатов выгружается в красивый CRM-интерфейс.
                    </p>
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 shadow-xl">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-400" /> Инновационная функция автопаузы:
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Как только менеджер пишет сообщение клиенту вручную, **ИИ-бот автоматически уходит на паузу** (`state: paused`), предотвращая наложение ответов и обеспечивая комфортный человеческий сервис.
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 w-full flex justify-center items-center relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 to-transparent blur-3xl rounded-full"></div>
                    <img 
                      src="/images/lensflow_whatsapp.png" 
                      className="rounded-3xl border border-white/10 shadow-2xl z-10 max-h-[380px] object-cover" 
                      alt="WhatsApp AI Center" 
                    />
                  </div>
                </motion.div>
              )}

              {/* Slide 5: PWA Camera Barcode Scanner */}
              {currentSlide === 5 && (
                <motion.div 
                  key="slide5"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                      <Scan className="w-3.5 h-3.5" /> Мобильный Сканер Камеры
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      Быстрый PWA-сканер{" "}
                      <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Штрихкодов & QR
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Превратите любое мобильное устройство в мощный терминал сбора данных прямо в браузере. Мобильный сканер интегрирован во все ключевые операции склада.
                    </p>
                    <div className="grid grid-cols-1 gap-3.5 mt-4">
                      <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold">🔍</div>
                        <div className="text-xs">
                          <h4 className="text-white font-bold">Быстрый поиск остатков</h4>
                          <p className="text-slate-400 mt-0.5 font-light">Сканирование штрихкода мгновенно фильтрует складскую ведомость.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">📦</div>
                        <div className="text-xs">
                          <h4 className="text-white font-bold">Умная Приемка (Накладные)</h4>
                          <p className="text-slate-400 mt-0.5 font-light">Автоматическое добавление позиций в накладную или инкремент количества на +1.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 text-sm font-bold">🗑️</div>
                        <div className="text-xs">
                          <h4 className="text-white font-bold">Списание брака</h4>
                          <p className="text-slate-400 mt-0.5 font-light">Быстрое сканирование поврежденных очковых линз для акта списания.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full flex justify-center items-center relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/15 to-transparent blur-3xl rounded-full"></div>
                    <img 
                      src="/images/lensflow_scanner.png" 
                      className="rounded-3xl border border-white/10 shadow-2xl z-10 max-h-[380px] object-cover" 
                      alt="Mobile Barcode Scanner" 
                    />
                  </div>
                </motion.div>
              )}

              {/* Slide 6: Marketing Analytics */}
              {currentSlide === 6 && (
                <motion.div 
                  key="slide6"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                      <BarChart3 className="w-3.5 h-3.5" /> Сквозная Аналитика
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      Контроль Маркетинга:{" "}
                      <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                        CAC, LTV и ROMI
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Красивый, современный аналитический дашборд, который объединяет рекламные расходы и реальную выручку клиники для вычисления точной окупаемости инвестиций.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 text-center shadow-lg">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">ROMI (ROI)</span>
                        <span className="text-xl md:text-2xl font-black text-white mt-1.5 block">348%</span>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 text-center shadow-lg">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Ср. CAC</span>
                        <span className="text-xl md:text-2xl font-black text-white mt-1.5 block">2 450 ₸</span>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 text-center shadow-lg">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Конверсия</span>
                        <span className="text-xl md:text-2xl font-black text-white mt-1.5 block">18.4%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full max-w-md p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-6 shadow-2xl">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-400" /> Автоматические метрики:
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Рекламный бюджет (Ad spend)</span>
                        <span className="text-white font-semibold">1 200 000 ₸</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Количество лидов из WhatsApp</span>
                        <span className="text-emerald-400 font-semibold">1 480 лидов</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Стоимость клика (CPC)</span>
                        <span className="text-white font-semibold">85 ₸</span>
                      </div>
                      <div className="h-[1px] bg-white/10"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-sm">Чистая прибыль по когортам</span>
                        <span className="text-emerald-400 font-extrabold text-lg">4 176 000 ₸</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Slide 7: Integrated Orders & Lab */}
              {currentSlide === 7 && (
                <motion.div 
                  key="slide7"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                      🧪 Лаборатория линз & Заказы
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      Бланки Рецептов и{" "}
                      <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Заказы в Производство
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Врачи клиники могут выписывать сложные рецепты (OD, OS, Сфера, Цилиндр, Аддидация) и мгновенно отправлять бланки заказов в оптическую лабораторию в один клик.
                    </p>
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 shadow-xl">
                      <h4 className="text-white font-bold text-sm mb-3">OD / OS Оптические параметры:</h4>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-white/5 p-2.5 rounded border border-white/5">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Sphere</span>
                          <span className="text-white font-bold text-sm mt-1 block">-3.25</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded border border-white/5">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Cylinder</span>
                          <span className="text-white font-bold text-sm mt-1 block">-1.25</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded border border-white/5">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Axis</span>
                          <span className="text-white font-bold text-sm mt-1 block">180°</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded border border-white/5">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Add</span>
                          <span className="text-white font-bold text-sm mt-1 block">+2.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full max-w-md p-6 rounded-3xl bg-slate-955/65 border border-white/10 space-y-4 shadow-2xl">
                    <h3 className="text-white font-bold text-lg">Функции медицинского модуля:</h3>
                    <ul className="space-y-3.5 text-xs md:text-sm text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Медицинские карты пациентов:</strong> Интеграция истории консультаций офтальмолога и рецептов очков.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>Мгновенный трекинг статуса:</strong> Статусы заказов («В работе», «Готов», «Отгружен») обновляются автоматически в кабинете врача.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span><strong>QR-коды накладных:</strong> Каждый бланк заказа содержит QR-код для быстрого поиска на производстве.</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* Slide 8: Technical Stack */}
              {currentSlide === 8 && (
                <motion.div 
                  key="slide8"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                      ⚙️ Технический Стек
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      Скорость, Надежность и{" "}
                      <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        Высокая Масштабируемость
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Система построена на базе лучших современных фреймворков и практик разработки, что гарантирует мгновенный отклик интерфейса на мобильных устройствах и стабильность под высокими нагрузками.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-xs text-emerald-400 font-semibold font-mono">React 18+ (TS)</span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-xs text-emerald-400 font-semibold font-mono">Next.js 14 (App Router)</span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-xs text-emerald-400 font-semibold font-mono">Framer Motion</span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-xs text-emerald-400 font-semibold font-mono">Prisma ORM</span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-xs text-emerald-400 font-semibold font-mono">PostgreSQL</span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-xs text-emerald-400 font-semibold font-mono">Tailwind CSS</span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/5 text-xs text-emerald-400 font-semibold font-mono">PWA (Html5Qrcode)</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full max-w-md p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 shadow-2xl">
                    <h3 className="text-white font-bold text-lg">Архитектурные преимущества:</h3>
                    <div className="space-y-4 text-xs md:text-sm leading-relaxed text-slate-300">
                      <p>💻 <strong>Тонкие представления (Thin Views):</strong> Вся сложная бизнес-логика, валидация и манипуляции с остатками вынесены на уровень бэкенда и моделей данных.</p>
                      <p>⚡ <strong>Оптимальные запросы ORM:</strong> Комплексные связи запрашиваются с использованием эффективных джоинов, исключая N+1 проблемы.</p>
                      <p>🤖 <strong>Асинхронные операции:</strong> Интеграции, WhatsApp нотификации и объемные отчеты выполняются в фоновом режиме, не блокируя пользовательский интерфейс.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Slide 9: Growth & Roadmap */}
              {currentSlide === 9 && (
                <motion.div 
                  key="slide9"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
                >
                  <div className="flex-1 text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                      🚀 Дорожная Карта
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                      Как LensFlow{" "}
                      <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Завоюет Рынок Оптики
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Мы создали невероятно сильное, премиальное ядро системы. Впереди — расширение возможностей искусственного интеллекта и построение глобальной B2B сети.
                    </p>
                    <div className="flex items-center gap-4 pt-4">
                      <button 
                        onClick={() => setCurrentSlide(1)} 
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-xs hover:shadow-lg hover:shadow-blue-500/30 transition duration-300"
                      >
                        В начало презентации
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 w-full max-w-md p-6 rounded-3xl bg-slate-900/60 border border-white/10 space-y-4 shadow-2xl">
                    <h3 className="text-white font-bold text-base">Следующие шаги развития:</h3>
                    <div className="space-y-3.5">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider font-mono">Квартал 2</span>
                        <h4 className="text-white font-semibold text-xs mt-0.5">AI-анализ сканирований лица (Face Scan)</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Автоматический подбор идеальной оправы по фото.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-wider font-mono">Квартал 3</span>
                        <h4 className="text-white font-semibold text-xs mt-0.5">B2B Маркетплейс для Лабораторий</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Система торговли складскими запасами линз между клиниками.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider font-mono">Квартал 4</span>
                        <h4 className="text-white font-semibold text-xs mt-0.5">Франшизная сеть в один клик</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Быстрое клонирование кабинетов и складов для открытия филиалов.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Footer Controls of presentation box */}
          <div className="w-full mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
            <button 
              onClick={prevSlide} 
              disabled={currentSlide === 1} 
              className="px-4 py-2.5 rounded-xl bg-white/5 disabled:opacity-40 disabled:pointer-events-none hover:bg-white/10 border border-white/5 text-xs font-bold transition flex items-center gap-2 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" /> Назад
            </button>
            
            {/* Bullet dots indicators */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <span 
                  key={idx} 
                  onClick={() => setCurrentSlide(idx + 1)} 
                  className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-300 ${
                    currentSlide === idx + 1 
                      ? 'bg-blue-500 scale-125 shadow-md shadow-blue-500/50' 
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                >
                </span>
              ))}
            </div>

            <button 
              onClick={nextSlide} 
              disabled={currentSlide === totalSlides} 
              className="px-4 py-2.5 rounded-xl bg-white/5 disabled:opacity-40 disabled:pointer-events-none hover:bg-white/10 border border-white/5 text-xs font-bold transition flex items-center gap-2 text-slate-300"
            >
              Далее <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
