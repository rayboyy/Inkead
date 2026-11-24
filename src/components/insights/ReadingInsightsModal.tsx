import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, ReadingSession } from '../../types';
import { Flame, Clock, CheckCircle2, TrendingUp, X, Activity } from 'lucide-react';

interface ReadingInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  sessions: ReadingSession[];
}

export const ReadingInsightsModal: React.FC<ReadingInsightsModalProps> = ({
  isOpen,
  onClose,
  books,
  sessions,
}) => {
  // Compute analytics
  const analytics = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const completedBooks = books.filter((b) => b.status === 'completed').length;

    // Calculate current consecutive day streak
    // Distinct sorted dates
    const dateSet = new Set(sessions.map((s) => s.date));
    let streak = 0;
    const today = new Date();

    // Check backwards from today (or yesterday if today hasn't had a session yet)
    let checkDate = new Date(today);
    const todayStr = checkDate.toISOString().split('T')[0];
    
    // If not read today, check if read yesterday
    if (!dateSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (dateSet.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 7-day bar chart data
    const last7Days: { date: string; dayLabel: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayMinutes = sessions
        .filter((s) => s.date === dateStr)
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      last7Days.push({
        date: dateStr,
        dayLabel,
        minutes: dayMinutes,
      });
    }

    const maxChartMinutes = Math.max(30, ...last7Days.map((d) => d.minutes));

    return {
      totalMinutes,
      completedBooks,
      streak,
      last7Days,
      maxChartMinutes,
      totalSessions: sessions.length,
    };
  }, [books, sessions]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 text-[var(--text-primary)] max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Reading Insights
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-normal">
                  Local-first analytics derived from your offline reading logs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Metric Cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {/* Metric 1: Streak */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs flex flex-col items-center text-center">
              <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] mb-2">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">
                Daily Streak
              </span>
              <p className="text-xl sm:text-2xl font-semibold font-num text-[var(--text-primary)] mt-0.5">
                {analytics.streak} {analytics.streak === 1 ? 'Day' : 'Days'}
              </p>
            </div>

            {/* Metric 2: Total Time */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs flex flex-col items-center text-center">
              <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">
                Total Focus
              </span>
              <p className="text-xl sm:text-2xl font-semibold font-num text-[var(--text-primary)] mt-0.5">
                {analytics.totalMinutes >= 60
                  ? `${(analytics.totalMinutes / 60).toFixed(1)} hrs`
                  : `${analytics.totalMinutes} min`}
              </p>
            </div>

            {/* Metric 3: Books Completed */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs flex flex-col items-center text-center">
              <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">
                Completed
              </span>
              <p className="text-xl sm:text-2xl font-semibold font-num text-[var(--text-primary)] mt-0.5">
                {analytics.completedBooks} / {books.length}
              </p>
            </div>
          </div>

          {/* 7-Day Reading Chart */}
          <div className="mt-6 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
                Last 7 Days (Minutes Read)
              </span>
              <span className="text-xs text-[var(--text-muted)] font-num font-normal">
                Goal: 30m / day
              </span>
            </div>

            {/* SVG/CSS Bar Chart */}
            <div className="flex items-end justify-between gap-3 h-36 pt-6 px-2">
              {analytics.last7Days.map((d, idx) => {
                const heightPct = Math.min(100, (d.minutes / analytics.maxChartMinutes) * 100);
                const isToday = idx === 6;

                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                    {/* Tooltip on hover */}
                    <span className="text-[11px] font-num font-medium text-[var(--text-muted)] group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] transition">
                      {d.minutes > 0 ? `${d.minutes}m` : '-'}
                    </span>

                    {/* Bar */}
                    <div className="w-full max-w-[28px] h-24 bg-[var(--bg-surface)] rounded-xl relative overflow-hidden flex items-end border border-[var(--border-color)]">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-xl transition-all duration-500 ${
                          isToday
                            ? 'bg-[#0071E3] dark:bg-[#2997FF]'
                            : d.minutes >= 30
                            ? 'bg-[#0071E3]/80 dark:bg-[#2997FF]/80'
                            : d.minutes > 0
                            ? 'bg-[#0071E3]/50 dark:bg-[#2997FF]/50'
                            : 'bg-transparent'
                        }`}
                      />
                    </div>

                    {/* Day Label */}
                    <span
                      className={`text-[11px] font-medium ${
                        isToday
                          ? 'text-[#0071E3] dark:text-[#2997FF] font-semibold'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {d.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer stats */}
          <div className="mt-6 flex items-center justify-between text-xs text-stone-500 px-1">
            <span>Logged sessions: {analytics.totalSessions}</span>
            <span>Total library volume: {books.length} titles</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
