import { CheckCircle2, ClipboardList, TrendingUp, AlertCircle } from 'lucide-react';
import type { Assignment } from '../../types';
import { dashboardStats } from '../../lib/progress';
import { Card } from '../ui/Card';

export function StatsOverview({ assignments }: { assignments: Assignment[] }) {
  const stats = dashboardStats(assignments);

  const items = [
    {
      label: 'Assignments',
      value: stats.totalAssignments,
      icon: <ClipboardList className="h-5 w-5" />,
      tone: 'text-brand-600 bg-brand-50',
    },
    {
      label: 'Overall progress',
      value: `${stats.overallProgress}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Tasks done',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      icon: <CheckCircle2 className="h-5 w-5" />,
      tone: 'text-sky-600 bg-sky-50',
    },
    {
      label: 'Overdue',
      value: stats.overdueAssignments,
      icon: <AlertCircle className="h-5 w-5" />,
      tone: stats.overdueAssignments > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <div className={`mb-2 inline-flex rounded-lg p-2 ${item.tone}`}>{item.icon}</div>
          <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
          <p className="text-xs text-slate-500">{item.label}</p>
        </Card>
      ))}
    </div>
  );
}
