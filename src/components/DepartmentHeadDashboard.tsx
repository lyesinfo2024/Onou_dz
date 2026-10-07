import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Building2, 
  ShieldCheck, 
  Stethoscope, 
  Brain, 
  Utensils, 
  Wrench, 
  Shield, 
  Mail, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Send,
  Award,
  Lock,
  ArrowRight,
  Plus,
  FileEdit,
  Inbox,
  ChevronRight,
  Paperclip,
  Flame,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';
import { Department, Report, ReportsStats, Directive, DirectivesStats } from '../types/index.ts';
import { ReportStatusBadge, ReportTypeBadge } from './ReportBadge.tsx';
import { DirectivePriorityBadge, DirectiveStatusBadge, DirectiveTargetBadge } from './DirectiveBadge.tsx';
import { ReportFormModal } from './ReportFormModal.tsx';
import { ReportDetailModal } from './ReportDetailModal.tsx';
import { DirectiveDetailModal } from './DirectiveDetailModal.tsx';

interface DepartmentHeadDashboardProps {
  onOpenDepartmentsList: () => void;
  onOpenReportsTab: () => void;
  onOpenDirectivesTab?: () => void;
}

export const DepartmentHeadDashboard: React.FC<DepartmentHeadDashboardProps> = ({ 
  onOpenDepartmentsList,
  onOpenReportsTab,
  onOpenDirectivesTab
}) => {
  const { user, token } = useAuth();
  const [department, setDepartment] = useState<Department | null>(null);
  const [stats, setStats] = useState<ReportsStats | null>(null);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [directivesStats, setDirectivesStats] = useState<DirectivesStats | null>(null);
  const [recentDirectives, setRecentDirectives] = useState<Directive[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);
  const [selectedDirective, setSelectedDirective] = useState<Directive | null>(null);

  const fetchDashboardData = async () => {
    try {
      if (user?.departmentId) {
        // 1. Fetch own department details
        const res = await fetch(`/api/departments/${user.departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setDepartment(data.data);
        }

        // 2. Fetch reports statistics for this department
        const statsRes = await fetch('/api/reports/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
          if (statsData.recent) {
            setRecentReports(statsData.recent);
          }
        }

        // 3. Phase 3: Fetch directives statistics & recent directives for this department
        const dirStatsRes = await fetch('/api/directives/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dirStatsData = await dirStatsRes.json();
        if (dirStatsData.success) {
          setDirectivesStats(dirStatsData.stats);
        }

        const dirListRes = await fetch('/api/directives', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dirListData = await dirListRes.json();
        if (dirListData.success && Array.isArray(dirListData.data)) {
          setRecentDirectives(dirListData.data.slice(0, 4));
        }
      }
    } catch (err) {
      console.error('Failed to fetch department head dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, token]);

  const getDeptIcon = (code?: string) => {
    switch (code) {
      case 'medical': return <Stethoscope className="w-8 h-8 text-rose-600" />;
      case 'housing': return <Building2 className="w-8 h-8 text-blue-600" />;
      case 'psychology': return <Brain className="w-8 h-8 text-purple-600" />;
      case 'catering': return <Utensils className="w-8 h-8 text-amber-600" />;
      case 'maintenance': return <Wrench className="w-8 h-8 text-orange-600" />;
      case 'security': return <ShieldCheck className="w-8 h-8 text-emerald-600" />;
      default: return <Building2 className="w-8 h-8 text-slate-600" />;
    }
  };

  const handleOpenEdit = (report: Report) => {
    setReportToEdit(report);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Official Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/40 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>لوحة قيادة رئيس المصلحة — {department?.name || user?.departmentName || 'المصلحة المعتمدة'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              مرحباً، {user?.fullName?.startsWith('رئيس') ? user?.fullName : `رئيس ${department?.name || user?.departmentName || ''} (${user?.fullName})`}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-200">
                <strong className="text-indigo-400 ml-1">المديرية:</strong>
                {user?.directorateName || 'المديرية الجامعية التابعة'}
              </span>
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-200">
                <strong className="text-emerald-400 ml-1">المصلحة:</strong>
                {department?.name || user?.departmentName || 'المصلحة التابعة'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              منصة المتابعة الإدارية للخدمات الجامعية. يمكنك إعداد التقارير الدورية لمصلحتك ومتابعة توجيهات المدير وتأكيد تنفيذها رسمياً ضمن نطاق مصلحتك حصراً.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenDirectivesTab && (
              <button
                onClick={onOpenDirectivesTab}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-950/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>توجيهاتي ({directivesStats?.new_count || 0} جديدة)</span>
              </button>
            )}
            <button
              onClick={() => {
                setReportToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء تقرير جديد</span>
            </button>
            <button
              onClick={onOpenReportsTab}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>تقاريري</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert if there are directives needing action */}
      {directivesStats && directivesStats.new_count > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-amber-950 animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                لديك {directivesStats.new_count} توجيه إداري جديد من مدير الإقامة الجامعية!
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                توجيهات جديدة تنتظر تأكيد الاطلاع والشروع في الإجراءات التنفيذية.
              </p>
            </div>
          </div>
          {onOpenDirectivesTab && (
            <button
              onClick={onOpenDirectivesTab}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shrink-0 shadow-xs"
            >
              عرض التوجيهات
            </button>
          )}
        </div>
      )}

      {/* Critical Alert if there are reports needing revision */}
      {stats && stats.needs_revision > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-950 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                لديك {stats.needs_revision} تقرير يحتاج إلى تعديل بناءً على توجيهات المدير!
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                قام المدير بإعادة تقرير مع ملاحظات وتوجيهات محددة. يرجى الاطلاع على الملاحظات وإعادة الإرسال.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenReportsTab}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shrink-0"
          >
            عرض التقارير المطلوبة
          </button>
        </div>
      )}

      {/* Statistics Grid including Phase 3 "توجيهات جديدة" Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Phase 3 Card: توجيهات جديدة */}
        <div 
          onClick={onOpenDirectivesTab}
          className="bg-white p-4 rounded-xl border border-amber-300 shadow-2xs bg-amber-50/30 cursor-pointer hover:border-amber-400 hover:shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 block">توجيهات جديدة</span>
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
          </div>
          <span className="text-2xl font-extrabold text-amber-900 mt-1 block">
            {directivesStats ? directivesStats.new_count : 0}
          </span>
          <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
            بانتظار تأكيد الاطلاع
          </span>
        </div>

        {/* Phase 2 Card: المسودات */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">المسودات قيد الإعداد</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats ? stats.drafts : 0}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">تقارير غير مرسلة بعد</span>
        </div>

        {/* Phase 2 Card: تقارير مرسلة */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-700 block">تقارير مرسلة للإدارة</span>
          <span className="text-2xl font-extrabold text-blue-900 mt-1 block">{stats ? stats.submitted : 0}</span>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">بانتظار المراجعة</span>
        </div>

        {/* Phase 2 Card: معادة للتعديل */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/20">
          <span className="text-[11px] font-bold text-rose-700 block">تقارير تحتاج تعديل</span>
          <span className="text-2xl font-extrabold text-rose-900 mt-1 block">{stats ? stats.needs_revision : 0}</span>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">مطلوب إعادة صياغتها</span>
        </div>

        {/* Phase 2 Card: معتمدة رسمياً */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 block">تقارير معتمدة رسمياً</span>
          <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">{stats ? stats.reviewed : 0}</span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">معتمدة من المدير</span>
        </div>
      </div>

      {/* Phase 3 Section: "آخر التوجيهات" */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">آخر التوجيهات والتعليمات الإدارية</h3>
              <p className="text-xs text-slate-500">التوجيهات والتعليمات الرسمية الموجهة لمصلحتك</p>
            </div>
          </div>

          {onOpenDirectivesTab && (
            <button
              onClick={onOpenDirectivesTab}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition"
            >
              <span>سجل التوجيهات كاملاً</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentDirectives.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1 text-xs">
            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">لا توجد توجيهات جديدة حالياً</p>
            <p className="text-slate-400">ستظهر هنا التوجيهات والتعليمات فور إصدارها من المدير.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentDirectives.map((directive) => (
              <div 
                key={directive.id}
                onClick={() => setSelectedDirective(directive)}
                className="p-4 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DirectivePriorityBadge priority={directive.priority} />
                    <DirectiveStatusBadge status={directive.status} />
                    <DirectiveTargetBadge targetType={directive.target_type} deptName={directive.target_dept_name} />
                    <span className="text-xs font-bold text-slate-900 hover:text-amber-800 transition">
                      {directive.title}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>صادر من: {directive.creator_name || 'المدير'}</span>
                    <span>•</span>
                    <span className="font-mono">
                      تاريخ الإصدار: {new Date(directive.created_at).toLocaleDateString('ar-DZ')}
                    </span>
                    {directive.due_date && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-amber-900 font-bold">
                          الأجل: {new Date(directive.due_date).toLocaleDateString('ar-DZ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDirective(directive);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                  >
                    عرض ومتابعة التنفيذ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: "آخر تقارير مصلحتي" (Phase 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">آخر تقارير {user?.departmentName}</h3>
              <p className="text-xs text-slate-500">متابعة المسودات والتقارير المرسلة للإدارة</p>
            </div>
          </div>

          <button
            onClick={onOpenReportsTab}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>كل تقارير المصلحة</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1 text-xs">
            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">لا توجد تقارير مسجلة بعد</p>
            <p className="text-slate-400">اضغط على زر "إنشاء تقرير جديد" لبدء إعداد تقارير مصلحتك.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentReports.map((report) => (
              <div 
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="p-4 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ReportTypeBadge type={report.report_type} />
                    <ReportStatusBadge status={report.status} />
                    <span className="text-xs font-bold text-slate-800 hover:text-emerald-700 transition">
                      {report.title}
                    </span>
                    {(report.attachments_count || 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px] font-bold" title={`${report.attachments_count} مرفقات`}>
                        <Paperclip className="w-2.5 h-2.5" />
                        <span>{report.attachments_count}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span className="font-mono">
                      {report.report_type === 'DAILY' && (report.report_date || '—')}
                      {report.report_type === 'WEEKLY' && `${report.period_start || ''} إلى ${report.period_end || ''}`}
                      {report.report_type === 'MONTHLY' && (report.period_start || report.report_date || '—')}
                    </span>
                    <span>•</span>
                    <span className="font-mono">
                      {report.submitted_at 
                        ? `أرسل في: ${new Date(report.submitted_at).toLocaleDateString('ar-DZ')}` 
                        : `أنشئ في: ${new Date(report.created_at).toLocaleDateString('ar-DZ')}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {['DRAFT', 'NEEDS_REVISION'].includes(report.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(report);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                  >
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Department Identity Card + Permissions Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Department Full Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  {getDeptIcon(user?.departmentCode)}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400">بطاقة التكليف الإداري</span>
                  <h3 className="text-lg font-bold text-slate-900">{department?.name || user?.departmentName}</h3>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                مصلحة معتمدة
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-1">المهام والاختصاص الإداري:</h4>
                <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed">
                  {department?.description || user?.departmentDescription || 'المتابعة اليومية وإعداد التقارير الإدارية والتنسيق المباشر مع إدارة الإقامة الجامعية.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 block">رئيس المصلحة:</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">{user?.fullName}</span>
                </div>
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 block">البريد الإلكتروني المهني:</span>
                  <span className="text-xs font-mono text-slate-800 mt-0.5 block">{user?.email}</span>
                </div>
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 block">رقم الهاتف الإداري:</span>
                  <span className="text-xs font-mono text-slate-800 mt-0.5 block">{user?.phone || 'غير مسجل'}</span>
                </div>
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 block">مرجعية التبعية:</span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block">مدير الإقامة الجامعية مباشرة</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Role-Based Access Control / Scope Limits */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>نطاق الصلاحيات الإدارية (المرحلة 3)</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">متابعة وتنفيذ توجيهات المدير</span>
                  <span className="text-[11px] text-amber-800">الاطلاع، بدء التنفيذ، وتأكيد الإنجاز لتوجيهات {user?.departmentName} والعامة.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">إعداد ورفع تقارير {user?.departmentName}</span>
                  <span className="text-[11px] text-emerald-800">صلاحية كاملة لإنشاء وتعديل مسودات وإرسال التقارير ومرفقاتها.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">معالجة ملاحظات وتعديلات المدير</span>
                  <span className="text-[11px] text-emerald-800">تعديل وإعادة إرسال التقارير أو التوجيهات المعادة للتصحيح.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-slate-700">عزل الصلاحيات المحكم</span>
                  <span className="text-[11px] text-slate-500">لا يمكنك الاطلاع على بيانات أو تقارير أو توجيهات خاصة بمصالح أخرى.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <ReportFormModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setReportToEdit(null);
          }}
          onSuccess={() => fetchDashboardData()}
          initialReport={reportToEdit}
        />
      )}

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          onRefresh={() => fetchDashboardData()}
          onEditReport={(rep) => handleOpenEdit(rep)}
        />
      )}

      {selectedDirective && (
        <DirectiveDetailModal
          directive={selectedDirective}
          isOpen={!!selectedDirective}
          onClose={() => setSelectedDirective(null)}
          onRefresh={() => fetchDashboardData()}
        />
      )}

    </div>
  );
};
