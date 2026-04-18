/**
 * Khatma Progress Visualizations — Charts & graphs for Quran completion tracking.
 *
 * Components:
 * - Daily Progress Chart (bar chart: completed vs remaining pages per day)
 * - Topic Distribution (pie chart: percentage of verses per topic)
 * - 30-Day Heatmap (calendar view of completion status)
 * - Milestone Progress (radial progress bar)
 * - Reading Frequency (when user typically reads)
 *
 * Uses: Recharts (lightweight, responsive, RTL-compatible)
 */

'use client';

import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, AreaChart
} from 'recharts';
import type { DaySchedule, TopicBreakdown } from '@/lib/khatmaPlanner';
import { TOPICS } from '@/lib/types';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface DailyProgressData {
  day: number;
  completed: number;
  remaining: number;
  date: string;
  topicId?: number;
}

interface TopicDistributionData {
  name: string;
  value: number;
  color: string;
}

interface HeatmapCell {
  date: string;
  day: number;
  week: number;
  completed: boolean;
  pages: number;
  topicId: number;
}

// ───────────────────────────────────────────────────────────────
// Daily Progress Bar Chart
// ───────────────────────────────────────────────────────────────

export function DailyProgressChart({
  schedule,
  currentDay,
}: {
  schedule: DaySchedule[];
  currentDay: number;
}) {
  // Transform daily schedule into chart data
  const chartData: DailyProgressData[] = schedule.slice(0, 30).map((day, idx) => ({
    day: day.day,
    completed: day.isCompleted ? day.pagesCount : 0,
    remaining: !day.isCompleted ? day.pagesCount : 0,
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    topicId: day.topicId,
  }));

  // Color based on topic
  const topicColors: Record<number, string> = {
    1: '#7C8E3E', 2: '#5BA3CF', 3: '#C9A43E',
    4: '#D4839B', 5: '#9B8EC4', 6: '#4DBDB5',
    7: '#D4854A'
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">
        📊 Daily Reading Progress
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <defs>
            <linearGradient id="gradComplete" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="gradRemaining" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#D97706" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={(value) => [`${value} pages`, '']}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Legend />
          <Bar dataKey="completed" fill="url(#gradComplete)" name="Completed" radius={[8, 8, 0, 0]} />
          <Bar dataKey="remaining" fill="url(#gradRemaining)" name="Remaining" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Topic Distribution Pie Chart
// ───────────────────────────────────────────────────────────────

export function TopicDistributionChart({
  schedule,
}: {
  schedule: DaySchedule[];
}) {
  // Calculate topic distribution across all scheduled days
  const topicCounts: Record<number, number> = {};
  schedule.forEach(day => {
    if (day.topicId) {
      topicCounts[day.topicId] = (topicCounts[day.topicId] || 0) + day.pagesCount;
    }
  });

  const topicNames: Record<number, string> = {
    1: 'عجائب الكون', 2: 'الجنة', 3: 'الأحكام',
    4: 'قصص الأنبياء', 5: 'القرآن', 6: 'يوم القيامة',
    7: 'التحذير'
  };

  const topicColors: Record<number, string> = {
    1: '#7C8E3E', 2: '#5BA3CF', 3: '#C9A43E',
    4: '#D4839B', 5: '#9B8EC4', 6: '#4DBDB5',
    7: '#D4854A'
  };

  const chartData: TopicDistributionData[] = Object.entries(topicCounts).map(([id, count]) => ({
    name: topicNames[parseInt(id)],
    value: count,
    color: topicColors[parseInt(id)],
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">
        🌈 Topic Distribution
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={(value) => [`${value} pages`, '']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// 30-Day Heatmap Calendar
// ───────────────────────────────────────────────────────────────

export function HeatmapCalendar({
  schedule,
}: {
  schedule: DaySchedule[];
}) {
  // Generate heatmap cells (weeks × days)
  const cells: HeatmapCell[] = schedule.slice(0, 30).map((day, idx) => {
    const date = new Date(day.date);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      day: idx + 1,
      week: Math.floor(idx / 7),
      completed: day.isCompleted,
      pages: day.pagesCount,
      topicId: day.topicId,
    };
  });

  const topicColors: Record<number, string> = {
    1: '#7C8E3E', 2: '#5BA3CF', 3: '#C9A43E',
    4: '#D4839B', 5: '#9B8EC4', 6: '#4DBDB5',
    7: '#D4854A'
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">
        📅 30-Day Heatmap
      </h3>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((week) => (
          <div key={week} className="flex gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
              const cellIdx = week * 7 + dayOfWeek;
              const cell = cells[cellIdx];
              if (!cell) return <div key={dayOfWeek} className="w-8 h-8" />;

              return (
                <div
                  key={cellIdx}
                  className={`
                    w-10 h-10 rounded flex items-center justify-center text-xs font-medium
                    transition-all hover:scale-110 cursor-help
                    ${cell.completed
                      ? 'text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }
                  `}
                  style={{
                    backgroundColor: cell.completed
                      ? topicColors[cell.topicId] || '#6B7280'
                      : undefined,
                  }}
                  title={`Day ${cell.day}: ${cell.pages} pages ${cell.completed ? '✓' : '○'}`}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
        Colors represent topics • Hover for details
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Cumulative Progress Line Chart
// ───────────────────────────────────────────────────────────────

export function CumulativeProgressChart({
  schedule,
  totalPages = 604,
}: {
  schedule: DaySchedule[];
  totalPages?: number;
}) {
  let cumulativePages = 0;
  const chartData = schedule.slice(0, 30).map((day) => {
    cumulativePages += day.pagesCount;
    return {
      day: day.day,
      cumulative: cumulativePages,
      percentage: Math.round((cumulativePages / totalPages) * 100),
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">
        📈 Cumulative Progress
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
          <defs>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6B7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={(value, name) => {
              if (name === 'cumulative') return [`${value} pages`, 'Pages'];
              return [`${value}%`, 'Complete'];
            }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="cumulative"
            stroke="#8B5CF6"
            fillOpacity={1}
            fill="url(#colorCumulative)"
            name="Pages Read"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="percentage"
            stroke="#EC4899"
            strokeWidth={2}
            dot={false}
            name="Percentage"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Reading Frequency Histogram
// ───────────────────────────────────────────────────────────────

export function ReadingFrequencyChart({
  readingHours,
}: {
  readingHours: number[];
}) {
  // Count readings per hour (0-23)
  const hourCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;

  readingHours.forEach(hour => {
    if (hour >= 0 && hour < 24) hourCounts[hour]++;
  });

  const chartData = Object.entries(hourCounts).map(([hour, count]) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    readings: count,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">
        ⏰ Reading Frequency by Hour
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="hour"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 10, fill: '#6B7280' }}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={(value) => [`${value} times`, 'Readings']}
          />
          <Bar dataKey="readings" fill="#06B6D4" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Statistics Cards
// ───────────────────────────────────────────────────────────────

export function KhatmaStatsCards({
  schedule,
  currentDay,
  totalDays,
}: {
  schedule: DaySchedule[];
  currentDay: number;
  totalDays: number;
}) {
  const completedDays = schedule.filter(d => d.isCompleted).length;
  const completedPages = schedule.filter(d => d.isCompleted).reduce((sum, d) => sum + d.pagesCount, 0);
  const remainingDays = totalDays - currentDay + 1;
  const avgPagesDay = remainingDays > 0 ? Math.ceil((604 - completedPages) / remainingDays) : 0;

  const stats = [
    {
      label: 'Days Completed',
      value: completedDays,
      icon: '✓',
      color: 'emerald',
    },
    {
      label: 'Pages Read',
      value: completedPages,
      icon: '📖',
      color: 'blue',
    },
    {
      label: 'Days Remaining',
      value: remainingDays,
      icon: '⏳',
      color: 'amber',
    },
    {
      label: 'Pages/Day (Adjusted)',
      value: avgPagesDay,
      icon: '⚡',
      color: 'purple',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`
            bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100
            dark:from-${stat.color}-900/20 dark:to-${stat.color}-800/10
            rounded-lg p-4 text-center border border-${stat.color}-200
            dark:border-${stat.color}-800/30
          `}
        >
          <div className="text-2xl mb-1">{stat.icon}</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
