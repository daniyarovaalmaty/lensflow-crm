import React from 'react';
import prisma from '@/lib/db/prisma';
import { BarChart2, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Disable caching for real-time results

export default async function CasesResultsPage() {
  const votes = await prisma.caseVote.findMany({
    orderBy: { createdAt: 'desc' }
  });

  // Aggregate votes by case
  const casesStats: Record<number, Record<string, number>> = {};
  const totalVotesByCase: Record<number, number> = {};

  votes.forEach(vote => {
    if (!casesStats[vote.caseId]) {
      casesStats[vote.caseId] = {};
      totalVotesByCase[vote.caseId] = 0;
    }
    if (!casesStats[vote.caseId][vote.vote]) {
      casesStats[vote.caseId][vote.vote] = 0;
    }
    casesStats[vote.caseId][vote.vote]++;
    totalVotesByCase[vote.caseId]++;
  });

  const caseIds = Object.keys(casesStats).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-indigo-500" />
              Результаты голосования по кейсам
            </h1>
            <p className="text-slate-400 mt-2">Статистика ответов участников (Анонимно)</p>
          </div>
          <Link href="/cases" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors bg-white/5 px-4 py-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Назад к кейсам
          </Link>
        </header>

        {caseIds.length === 0 ? (
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 text-center">
            <p className="text-slate-400">Пока нет ни одного голоса.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {caseIds.map(caseId => {
              const total = totalVotesByCase[caseId];
              const stats = casesStats[caseId];
              // Sort options by count
              const sortedOptions = Object.entries(stats).sort((a, b) => b[1] - a[1]);

              return (
                <div key={caseId} className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Кейс {caseId}</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Users className="w-4 h-4" />
                      Всего голосов: {total}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {sortedOptions.map(([optionName, count]) => {
                      const percentage = Math.round((count / total) * 100);
                      return (
                        <div key={optionName} className="relative">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-200">{optionName}</span>
                            <span className="text-slate-400">{count} чел. ({percentage}%)</span>
                          </div>
                          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
