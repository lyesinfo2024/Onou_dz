import React from 'react';
import { DirectivePriority, DirectiveStatus, DirectiveTargetType } from '../types/index.ts';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  Building2, 
  Users2,
  BellRing,
  Flame
} from 'lucide-react';

interface PriorityBadgeProps {
  priority: DirectivePriority;
  size?: 'sm' | 'md';
}

export const DirectivePriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const isSm = size === 'sm';
  const padding = isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  switch (priority) {
    case 'URGENT':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs ${padding}`}>
          <Flame className={isSm ? 'w-3 h-3 text-rose-600' : 'w-3.5 h-3.5 text-rose-600'} />
          <span>عاجل</span>
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${padding}`}>
          <AlertTriangle className={isSm ? 'w-3 h-3 text-amber-600' : 'w-3.5 h-3.5 text-amber-600'} />
          <span>هام</span>
        </span>
      );
    case 'NORMAL':
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-50 text-slate-700 border border-slate-200/80 ${padding}`}>
          <Clock className={isSm ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-500'} />
          <span>عادي</span>
        </span>
      );
  }
};

interface StatusBadgeProps {
  status: DirectiveStatus;
  size?: 'sm' | 'md';
}

export const DirectiveStatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const isSm = size === 'sm';
  const padding = isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'NEW':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs ${padding}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>جديد</span>
        </span>
      );
    case 'ACKNOWLEDGED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 ${padding}`}>
          <Clock className={isSm ? 'w-3 h-3 text-indigo-600' : 'w-3.5 h-3.5 text-indigo-600'} />
          <span>تم الاطلاع</span>
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-amber-50 text-amber-900 border border-amber-300 ${padding}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
          <span>قيد التنفيذ</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 ${padding}`}>
          <CheckCircle2 className={isSm ? 'w-3 h-3 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'} />
          <span>تم التنفيذ</span>
        </span>
      );
    case 'RETURNED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-rose-50 text-rose-800 border border-rose-300 ${padding}`}>
          <RotateCcw className={isSm ? 'w-3 h-3 text-rose-600' : 'w-3.5 h-3.5 text-rose-600'} />
          <span>معاد للتصحيح</span>
        </span>
      );
    default:
      return null;
  }
};

interface TargetBadgeProps {
  targetType: DirectiveTargetType;
  deptName?: string;
  size?: 'sm' | 'md';
}

export const DirectiveTargetBadge: React.FC<TargetBadgeProps> = ({ targetType, deptName, size = 'sm' }) => {
  const isSm = size === 'sm';
  const padding = isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  if (targetType === 'ALL') {
    return (
      <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-purple-50 text-purple-800 border border-purple-200 ${padding}`}>
        <Users2 className={isSm ? 'w-3 h-3 text-purple-600' : 'w-3.5 h-3.5 text-purple-600'} />
        <span>جميع المصالح (عام)</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-200 ${padding}`}>
      <Building2 className={isSm ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-500'} />
      <span>{deptName || 'مصلحة محددة'}</span>
    </span>
  );
};
