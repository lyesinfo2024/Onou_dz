import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Stethoscope, 
  Brain, 
  Utensils, 
  Wrench, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Phone, 
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Send,
  Award,
  ChevronRight,
  Database,
  AlertCircle,
  Inbox,
  CalendarDays,
  Paperclip
} from 'lucide-react';
import { Department, Report, ReportsStats, Directive, DirectivesStats } from '../types/index.ts';
import { ReportStatusBadge, ReportTypeBadge } from './ReportBadge.tsx';
import { DirectivePriorityBadge, DirectiveStatusBadge, DirectiveTargetBadge } from './DirectiveBadge.tsx';
import { ReportDetailModal } from './ReportDetailModal.tsx';

interface DirectorDashboardProps {
  onSelectDepartment: (dept: Department) => void;
  onOpenUsersTab: () => void;
  onOpenReportsTab: () => void;
  onOpenDirectivesTab?: () => void;
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({ 
  onSelectDepartment,
  onOpenUsersTab,
  onOpenReportsTab,
  onOpenDirectivesTab
}) => {
  const { user, token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<ReportsStats | null>(null);
  const [directivesStats, setDirectivesStats] = useState<DirectivesStats | null>(null);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [recentDirectives, setRecentDirectives] = useState<Directive[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch departments
      const deptsRes = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const deptsData = await deptsRes.json();
      if (deptsData.success) {
        setDepartments(deptsData.data);
      }

      // 2. Fetch reports statistics and recent submitted reports
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

      // 3. Phase 3: Fetch directives statistics and recent directives
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
    } catch (err) {
      console.error('Failed to fetch director dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const getDeptIcon = (code: string) => {
    switch (code) {
      case 'medical': return <Stethoscope className="w-6 h-6 text-rose-600" />;
      case 'housing': return <Building2 className="w-6 h-6 text-blue-600" />;
      case 'psychology': return <Brain className="w-6 h-6 text-purple-600" />;
      case 'catering': return <Utensils className="w-6 h-6 text-amber-600" />;
      case 'maintenance': return <Wrench className="w-6 h-6 text-orange-600" />;
      case 'security': return <ShieldCheck className="w-6 h-6 text-emerald-600" />;
      default: return <Building2 className="w-6 h-6 text-slate-600" />;
    }
  };

  const getDeptBadgeClass = (code: string) => {
    switch (code) {
      case 'medical': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'housing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'psychology': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'catering': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'maintenance': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'security': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Official Welcome & Role Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/40 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>لوحة القيادة الإدارية المركزية — مدير الإقامة الجامعية</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              مرحباً بكم، {user?.fullName}
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              تتيح لك المنصة الآن الإشراف الكامل على المصالح الستة، ومتابعة التقارير اليومية والأسبوعية والشهرية الواردة، واعتمادها أو إعادتها للتعديل مع التوجيهات اللازمة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {onOpenDirectivesTab && (
              <button
                onClick={onOpenDirectivesTab}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-amber-950/20"
              >
                <Send className="w-4 h-4" />
                <span>إصدار ومتابعة التوجيهات</span>
                {directivesStats && directivesStats.total > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold mr-1">
                    {directivesStats.total}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={onOpenReportsTab}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-950/20"
            >
              <FileText className="w-4 h-4" />
              <span>سجل التقارير الإدارية</span>
            </button>
            <button
              onClick={onOpenUsersTab}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-600"
            >
              <Users className="w-4 h-4" />
              <span>المستخدمون</span>
            </button>
          </div>
        </div>
      </div>

      {/* Phase 3 Directives Overview Bar for Director */}
      {directivesStats && directivesStats.total > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50/30 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">نظام توجيهات المدير الإدارية</h4>
                <p className="text-[11px] text-slate-500">متابعة التكليفات والتعليمات الصادرة للمصالح وحالة تنفيذها</p>
              </div>
            </div>
            {onOpenDirectivesTab && (
              <button
                onClick={onOpenDirectivesTab}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 px-3 py-1.5 rounded-lg transition self-start sm:self-auto flex items-center gap-1"
              >
                <span>إدارة التوجيهات بالكامل</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[10px] text-slate-500 font-bold block">إجمالي التوجيهات</span>
              <span className="text-lg font-black text-slate-900">{directivesStats.total}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-center bg-blue-50/30">
              <span className="text-[10px] text-blue-700 font-bold block">توجيهات جديدة</span>
              <span className="text-lg font-black text-blue-800">{directivesStats.new_count}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-indigo-200 text-center bg-indigo-50/30">
              <span className="text-[10px] text-indigo-700 font-bold block">تم الاطلاع عليها</span>
              <span className="text-lg font-black text-indigo-800">{directivesStats.acknowledged}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-center bg-amber-50/30">
              <span className="text-[10px] text-amber-700 font-bold block">قيد التنفيذ</span>
              <span className="text-lg font-black text-amber-800">{directivesStats.in_progress}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center bg-emerald-50/30">
              <span className="text-[10px] text-emerald-700 font-bold block">تم إنجازها</span>
              <span className="text-lg font-black text-emerald-800">{directivesStats.completed}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-center bg-rose-50/30">
              <span className="text-[10px] text-rose-700 font-bold block">معادة للتصحيح</span>
              <span className="text-lg font-black text-rose-800">{directivesStats.returned}</span>
            </div>
          </div>
        </div>
      )}

      {/* Reports Statistics Bar (Real database numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">إجمالي التقارير المستلمة</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats?.total || 0}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">من كافة المصالح الستة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-700 block">التقارير الجديدة</span>
          <span className="text-2xl font-extrabold text-blue-900 mt-1 block">{stats?.submitted || 0}</span>
          <span className="text-[10px] text-blue-600 font-medium mt-0.5">مرسلة بانتظار المراجعة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-700 block">قيد المراجعة</span>
          <span className="text-2xl font-extrabold text-amber-900 mt-1 block">{stats?.under_review || 0}</span>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5">تحت نظر الإدارة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs bg-rose-50/20">
          <span className="text-[11px] font-bold text-rose-700 block">تحتاج إلى تعديل</span>
          <span className="text-2xl font-extrabold text-rose-900 mt-1 block">{stats?.needs_revision || 0}</span>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5">أعيدت مع الملاحظات</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/20 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-emerald-700 block">تمت المراجعة والاعتماد</span>
          <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">{stats?.reviewed || 0}</span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5">معتمدة رسمياً</span>
        </div>
      </div>

      {/* Section: "آخر التقارير المستلمة" (Recent Reports section) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">آخر التقارير الإدارية الواردة</h3>
              <p className="text-xs text-slate-500">أحدث التقارير المرسلة من رؤساء المصالح للمعاينة والاعتماد</p>
            </div>
          </div>

          <button
            onClick={onOpenReportsTab}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>عرض كل التقارير</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-1">
            <Inbox className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs font-bold text-slate-700">لا توجد تقارير مرسلة جديدة حالياً</p>
            <p className="text-[11px] text-slate-400">ستظهر هنا التقارير فور إرسالها من قبل رؤساء المصالح.</p>
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
                    <span className="font-semibold text-slate-700">{report.dept_name}</span>
                    <span>•</span>
                    <span>المسؤول: {report.author_name}</span>
                    <span>•</span>
                    <span className="font-mono">
                      {report.submitted_at 
                        ? new Date(report.submitted_at).toLocaleDateString('ar-DZ') 
                        : new Date(report.created_at).toLocaleDateString('ar-DZ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                  >
                    معاينة ومراجعة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The 6 Departments Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              المصالح الستة للإقامة الجامعية
            </h3>
            <p className="text-xs text-slate-500">
              المصالح الرسمية المرتبطة بالإدارة العامة وفق متطلبات الإقامة الجامعية
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
            6 مصالح مفعلة
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>جاري تحميل بيانات المصالح...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div 
                key={dept.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition">
                      {getDeptIcon(dept.code)}
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getDeptBadgeClass(dept.code)}`}>
                      رقم المصلحة #{dept.id}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {dept.name}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                    {dept.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400">رئيس المصلحة المعين:</div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {dept.head_name ? dept.head_name.charAt(0) : '؟'}
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {dept.head_name || 'لم يعين بعد'}
                      </span>
                    </div>

                    {dept.head_email && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{dept.head_email}</span>
                      </div>
                    )}
                    {dept.head_phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{dept.head_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>حالة المصلحة: نشطة</span>
                  </span>
                  <button
                    onClick={() => onSelectDepartment(dept)}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1 transition"
                  >
                    <span>التفاصيل</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <ReportDetailModal
        isOpen={!!selectedReport}
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onRefresh={() => fetchDashboardData()}
      />

    </div>
  );
};
