import React from 'react';
import { ReportStatus, ReportType } from '../types/index.ts';
import { 
  FileEdit, 
  Send, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  CalendarRange,
  CalendarDays
} from 'lucide-react';

interface ReportStatusBadgeProps {
  status: ReportStatus;
  size?: 'sm' | 'md';
}

export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const isSm = size === 'sm';
  const padClass = isSm ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  const iconSize = isSm ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (status) {
    case 'DRAFT':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${padClass}`}>
          <FileEdit className={iconSize} />
          <span>مسودة</span>
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${padClass}`}>
          <Send className={iconSize} />
          <span>مرسل للإدارة</span>
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${padClass}`}>
          <Clock className={iconSize} />
          <span>قيد المراجعة</span>
        </span>
      );
    case 'NEEDS_REVISION':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-300 animate-pulse ${padClass}`}>
          <AlertCircle className={iconSize} />
          <span>يحتاج إلى تعديل</span>
        </span>
      );
    case 'REVIEWED':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 ${padClass}`}>
          <CheckCircle2 className={iconSize} />
          <span>تمت المراجعة والاعتماد</span>
        </span>
      );
    default:
      return null;
  }
};

interface ReportTypeBadgeProps {
  type: ReportType;
  size?: 'sm' | 'md';
}

export const ReportTypeBadge: React.FC<ReportTypeBadgeProps> = ({ type, size = 'sm' }) => {
  const isSm = size === 'sm';
  const padClass = isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const iconSize = isSm ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (type) {
    case 'DAILY':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 ${padClass}`}>
          <CalendarDays className={iconSize} />
          <span>يومي</span>
        </span>
      );
    case 'WEEKLY':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200 ${padClass}`}>
          <CalendarRange className={iconSize} />
          <span>أسبوعي</span>
        </span>
      );
    case 'MONTHLY':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-purple-50 text-purple-800 border border-purple-200 ${padClass}`}>
          <Calendar className={iconSize} />
          <span>شهري</span>
        </span>
      );
    default:
      return null;
  }
};
