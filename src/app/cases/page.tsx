"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Activity, Eye, Brain, Stethoscope, AlertCircle } from 'lucide-react';

type VoteOption = 'ОКЛ' | 'Stellest' | 'Дефокусные МКЛ' | 'Комбинированный';

interface CaseData {
  id: number;
  title: string;
  patient: string;
  complaints: string;
  anamnesis: string[];
  vision: { label: string; values: string[] }[];
  refraction: string[];
  axialLength: string[];
  keratometry: string[];
  extra?: string[];
  correctAnswer?: VoteOption;
  explanation?: string[];
}

const cases: CaseData[] = [
  {
    id: 1,
    title: "Кейс 1",
    patient: "Девочка, 8 лет.",
    complaints: "Мама отмечает, что ребенок стал хуже видеть с последней парты, часто щурится, подносит книги близко к лицу.",
    anamnesis: [
      "Миопия впервые выявлена год назад (Было OD -0,75 / OS -0,50)",
      "За последний год прогрессирование на 0,75 D.",
      "Родители не готовы использовать контактные линзы.",
      "Ребенок боится любых манипуляций с глазами.",
      "Плаванием и активными видами спорта не занимается.",
      "Время за планшетом около 3 часов/сутки.",
      "Прогулки менее 1 часа в день."
    ],
    vision: [
      { label: "OD", values: ["Без коррекции — 0,2", "С коррекцией −1,75 D = 1,0"] },
      { label: "OS", values: ["Без коррекции — 0,3", "С коррекцией −1,50 D = 1,0"] }
    ],
    refraction: ["OD: Sph −1,75 D, Cyl −0,25 D Ax 180°", "OS: Sph −1,50 D, Cyl −0,25 D Ax 170°"],
    axialLength: ["OD: 24,28 мм", "OS: 24,15 мм"],
    keratometry: ["OD: K1 42,75 D @178°, K2 43,25 D @88°", "OS: K1 42,50 D @172°, K2 43,00 D @82°"],
    extra: ["Биомикроскопия: Без особенностей", "Глазное дно: Без патологии"],
    correctAnswer: 'Stellest',
    explanation: [
      "ребенок категорически не готов к контактным линзам;",
      "родители также против линз;",
      "астигматизм минимальный;",
      "хорошая острота зрения в очках;",
      "нет факторов, требующих отказа от очков."
    ]
  },
  {
    id: 2,
    title: "Кейс 2",
    patient: "Мальчик, 12 лет.",
    complaints: "Снижение зрения.",
    anamnesis: [
      "Было год назад OD -1,50 / OS -2,00",
      "Профессионально занимается плаванием 6 раз в неделю, участвует в соревнованиях.",
      "Очки постоянно не носит.",
      "Однодневные контактные линзы теряет в бассейне.",
      "Родители мотивированы на контроль миопии.",
      "Соблюдает режим сна, хорошая гигиена."
    ],
    vision: [
      { label: "OD", values: ["Без коррекции — 0,08", "С коррекцией −3,00 cyl -0,75 ax 180 = 1,0"] },
      { label: "OS", values: ["Без коррекции — 0,1", "С коррекцией −2,75 cyl -1,0 ax 170= 1,0"] }
    ],
    refraction: ["OD: −3,00 -0,50 ax 180", "OS: −2,75 -1,25 ax 165"],
    axialLength: ["OD: 24,95 мм", "OS: 24,82 мм"],
    keratometry: [
      "OD: K1 42,00 D, K2 42,75 D (Астигматизм 0,75 D)",
      "OS: K1 42,25 D, K2 42,75 D (Астигматизм 0,50 D)"
    ],
    extra: ["ВРСП — 12 секунд", "Биомикроскопия: Без особенностей"],
    correctAnswer: 'ОКЛ',
    explanation: [
      "профессиональное плавание;",
      "днем не нужны очки;",
      "хорошая форма роговицы;",
      "умеренная миопия;",
      "хорошие показатели слезной пленки;",
      "родители готовы соблюдать рекомендации."
    ]
  },
  {
    id: 3,
    title: "Кейс 3",
    patient: "Девочка, 14 лет.",
    complaints: "Снижение зрения. Не хочет носить очки, хочет хороший внешний вид.",
    anamnesis: [
      "В своих очках выписанных год назад visus 0,6/0,5",
      "Танцует современную хореографию.",
      "Очки постоянно не носит.",
      "Уже пользовалась обычными мягкими линзами, хорошо ухаживает.",
      "Ложится спать поздно (00:30–01:00), поэтому ночные линзы не хочет.",
      "Иногда ночует у подруг.",
      "Родители поддерживают контактную коррекцию."
    ],
    vision: [
      { label: "OD", values: ["Без коррекции — 0,1", "С коррекцией −2,50 = 1,0"] },
      { label: "OS", values: ["Без коррекции — 0,1", "С коррекцией −2,25 = 1,0"] }
    ],
    refraction: ["OD: −2,25", "OS: −2,25"],
    axialLength: ["OD: 24,65 мм", "OS: 24,54 мм"],
    keratometry: ["OD: K1 43,00 D, K2 43,50 D", "OS: K1 42,75 D, K2 43,50 D"],
    extra: ["ВРСП — 11 секунд", "Окрашивание флюоресцеином: Отрицательное", "Биомикроскопия: Без особенностей"],
    correctAnswer: 'Дефокусные МКЛ',
    explanation: [
      "уже имеет опыт ношения мягких линз;",
      "мотивирована;",
      "не подходит режим сна для ортокератологии;",
      "не хочет носить очки;",
      "хороший слезный статус;",
      "умеренная миопия без противопоказаний."
    ]
  },
  {
    id: 4,
    title: "Кейс 4 (MVL)",
    patient: "Мальчик 10 лет.",
    complaints: "Снижение зрения, неудобство ношения очков.",
    anamnesis: [
      "У мамы -8,0 Д, у папы -4,5 Д.",
      "Занимается футболом, плаванием.",
      "Носит очки с 7 лет.",
      "Последние очки -3,5 -0,5 180 / -3,75 -0,75 5 выписаны 6 мес назад, постоянно не носит, не удобно.",
      "Тренировки рано с утра, затем школа, рано ложится спать."
    ],
    vision: [],
    refraction: ["OD: -4,00 -0,75 ax 177", "OS: -4,25 -1,25 ax 6"],
    axialLength: ["ПЗО: 24,20 / 24,23 мм"],
    keratometry: ["OD: 42,75, 43,50", "OS: 42,78, 44,03"],
    extra: ["Характер зрения бинокулярный", "Фория вдаль 3 пд экзо, вблизи 2 пд экзо"],
  },
  {
    id: 5,
    title: "Кейс 5 (MVL)",
    patient: "Девочка 7 лет.",
    complaints: "Стала видеть слабее, обратилась на осмотр.",
    anamnesis: [
      "У мамы -3,75 Д, у папы -2,0 Д.",
      "Первые очки -2,75 -1,0 10 / -2,25 -0,75 165 выписаны 7 мес назад, носит постоянно.",
      "Ходит на рисование, на танцы.",
      "В анамнезе ППЛКС."
    ],
    vision: [],
    refraction: ["OD: -3,75 -2,0 ax 7", "OS: -3,25 -1,5 ax 168"],
    axialLength: ["ПЗО: 27,16 / 27,03 мм"],
    keratometry: ["OD: 37,85, 39,85", "OS: 37,60, 39,15"],
    extra: ["Характер зрения бинокулярный", "Фория вдаль 6 пд экзо, ПФР 10 пд", "Фория вблизи 10 пд экзо, ПФР 16 пд"],
  }
];

const votingOptions: { id: VoteOption; label: string; desc: string; color: string }[] = [
  { id: 'ОКЛ', label: 'ОКЛ', desc: 'Ортокератологические линзы', color: 'from-blue-500 to-indigo-600' },
  { id: 'Stellest', label: 'Дефокусные очки', desc: 'Например, Stellest', color: 'from-emerald-400 to-teal-500' },
  { id: 'Дефокусные МКЛ', label: 'Дефокусные МКЛ', desc: 'Например, Art Most', color: 'from-violet-500 to-purple-600' },
  { id: 'Комбинированный', label: 'Stellest + Art Most', desc: 'Комбинированный подход', color: 'from-amber-400 to-orange-500' }
];

export default function CasesVotingPage() {
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [votes, setVotes] = useState<Record<number, VoteOption>>({});
  const [showResult, setShowResult] = useState<Record<number, boolean>>({});

  const activeCase = cases[currentCaseIndex];
  const hasVoted = !!votes[activeCase.id];
  const showingResult = showResult[activeCase.id];

  const handleVote = (option: VoteOption) => {
    if (hasVoted) return;
    setVotes(prev => ({ ...prev, [activeCase.id]: option }));
    
    // Simulate API call to register vote, then show result
    setTimeout(() => {
      setShowResult(prev => ({ ...prev, [activeCase.id]: true }));
    }, 800);
  };

  const nextCase = () => {
    if (currentCaseIndex < cases.length - 1) {
      setCurrentCaseIndex(c => c + 1);
    }
  };

  const prevCase = () => {
    if (currentCaseIndex > 0) {
      setCurrentCaseIndex(c => c - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-brand-violet/30 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-black text-xl tracking-tighter">LF</span>
          </div>
          <div>
            <h1 className="text-white font-extrabold text-lg leading-none">LensFlow Hub</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 tracking-wider uppercase">Интерактивный разбор кейсов</p>
          </div>
        </div>
        <div className="flex gap-2">
          {cases.map((c, i) => (
            <button 
              key={c.id} 
              onClick={() => setCurrentCaseIndex(i)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${i === currentCaseIndex ? 'bg-indigo-500 scale-125' : votes[c.id] ? 'bg-emerald-500/50' : 'bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-4">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid lg:grid-cols-12 gap-8"
          >
            {/* Case Details */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white tracking-wider border border-white/10 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    {activeCase.title}
                  </div>
                  <h2 className="text-2xl font-black text-white">{activeCase.patient}</h2>
                </div>

                <div className="space-y-6 relative z-10">
                  {/* Complaints */}
                  <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400" /> Жалобы
                    </h3>
                    <p className="text-sm font-medium leading-relaxed">{activeCase.complaints}</p>
                  </div>

                  {/* Anamnesis */}
                  <div>
                    <h3 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-indigo-400" /> Анамнез
                    </h3>
                    <ul className="space-y-2">
                      {activeCase.anamnesis.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-indigo-500 mt-0.5">•</span>
                          <span className="text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Measurements Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Vision */}
                    {activeCase.vision.length > 0 && (
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <h3 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3">Острота зрения</h3>
                        <div className="space-y-3">
                          {activeCase.vision.map((v, i) => (
                            <div key={i}>
                              <div className="text-xs font-bold text-white mb-1">{v.label}</div>
                              {v.values.map((val, idx) => (
                                <div key={idx} className="text-xs text-slate-300">{val}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Refraction */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <h3 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3">Рефракция (Циклоплегия)</h3>
                      <div className="space-y-2">
                        {activeCase.refraction.map((item, idx) => (
                          <div key={idx} className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1.5 rounded-lg border border-emerald-400/20">{item}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <h3 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3">Кератометрия</h3>
                      <div className="space-y-2">
                        {activeCase.keratometry.map((item, idx) => (
                          <div key={idx} className="text-xs text-slate-300">{item}</div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <h3 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3">Доп. данные</h3>
                      <div className="space-y-2">
                        {activeCase.axialLength.map((item, idx) => (
                          <div key={idx} className="text-xs text-slate-300">{item}</div>
                        ))}
                        {activeCase.extra?.map((item, idx) => (
                          <div key={idx} className="text-xs text-slate-300">{item}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Voting Panel */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl">
                
                {!showingResult ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-2">Ваш вердикт</h3>
                    <p className="text-sm text-slate-400 mb-6">Какой метод контроля миопии наиболее рационален в данном случае?</p>
                    
                    <div className="space-y-3 mb-8">
                      {votingOptions.map(option => {
                        const isSelected = votes[activeCase.id] === option.id;
                        
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            disabled={hasVoted}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${
                              isSelected 
                                ? `bg-gradient-to-r ${option.color} border-transparent shadow-lg shadow-white/10` 
                                : hasVoted 
                                  ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10 cursor-pointer'
                            }`}
                          >
                            <div>
                              <div className={`font-bold ${isSelected ? 'text-white' : 'text-white group-hover:text-white'}`}>{option.label}</div>
                              <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{option.desc}</div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-white bg-white/20' : 'border-white/20 group-hover:border-white/50'}`}>
                              {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="text-center pb-6 border-b border-white/10">
                      <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Голос учтён!</h3>
                      <p className="text-sm text-slate-400">Вы выбрали: <span className="text-white font-bold">{votes[activeCase.id]}</span></p>
                    </div>

                    {activeCase.correctAnswer && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
                        <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Правильный ответ (Рекомендация экспертов)</div>
                        <div className="text-lg font-black text-white mb-4">{activeCase.correctAnswer}</div>
                        
                        {activeCase.explanation && (
                          <div className="space-y-2">
                            <div className="text-xs text-emerald-400/80 font-bold">Почему:</div>
                            <ul className="space-y-1.5">
                              {activeCase.explanation.map((exp, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-emerald-100/90">
                                  <span className="text-emerald-400 mt-0.5">✓</span>
                                  <span>{exp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!activeCase.correctAnswer && (
                      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-5 text-center">
                        <Stethoscope className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                        <div className="text-sm text-indigo-200">
                          Этот кейс из открытого обсуждения на конференции MVL. Участники и спикеры обсуждали оптимальный подход коллективно.
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}

                <div className="pt-6 mt-6 border-t border-white/10 flex justify-between items-center">
                  <button 
                    onClick={prevCase}
                    disabled={currentCaseIndex === 0}
                    className="text-sm font-semibold text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    Назад
                  </button>
                  <button 
                    onClick={nextCase}
                    disabled={currentCaseIndex === cases.length - 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-30"
                  >
                    Следующий кейс <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>

          </motion.div>
        </AnimatePresence>

      </main>
    </div>
  );
}
