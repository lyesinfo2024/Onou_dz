import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Report, ReportStatus, ReportType, ReportsStats, Department } from '../types/index.ts';
import { ReportStatusBadge, ReportTypeBadge } from './ReportBadge.tsx';
import { ReportFormModal } from './ReportFormModal.tsx';
import { ReportDetailModal } from './ReportDetailModal.tsx';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileEdit, 
  Send, 
  Trash2, 
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Inbox,
  Paperclip
} from 'lucide-react';

interface ReportsViewProps {
  onBack: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBack }) => {
  const { user, token } = useAuth();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<ReportsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<Report | null>(null);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);

  const isDirector = user?.role === 'DIRECTOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasAdminView = isDirector || isSuperAdmin;

  const fetchReportsData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch reports
      let url = '/api/reports?';
      if (hasAdminView && selectedDeptId !== 'ALL') {
        url += `department_id=${selectedDeptId}&`;
      }
      if (selectedType !== 'ALL') {
        url += `report_type=${selectedType}&`;
      }
      if (selectedStatus !== 'ALL') {
        url += `status=${selectedStatus}&`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
      }

      // 2. Fetch stats
      const statsRes = await fetch('/api/reports/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // 3. If admin/director, fetch departments list for filter
      if (hasAdminView) {
        const deptsRes = await fetch('/api/departments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const deptsData = await deptsRes.json();
        if (deptsData.success) {
          setDepartments(deptsData.data);
        }
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [token, selectedDeptId, selectedType, selectedStatus]);

  const handleShowNotification = (msg?: string) => {
    if (msg) {
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    }
    fetchReportsData();
  };

  const handleOpenEdit = (report: Report) => {
    setReportToEdit(report);
    setIsCreateModalOpen(true);
  };

  // Filter reports by search text
  const filteredReports = reports.filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      (r.dept_name && r.dept_name.toLowerCase().includes(query)) ||
      (r.author_name && r.author_name.toLowerCase().includes(query)) ||
      r.content.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              isSuperAdmin
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : isDirector
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {isSuperAdmin ? 'إشراف مركزي على تقارير كافة المديريات (SaaS)' : isDirector ? 'المرحلة 2: الرقابة والمتابعة الإدارية' : 'المرحلة 2: إعداد ورفع التقارير'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {isSuperAdmin
              ? 'المنظومة المركزية للتقارير الإدارية (كافة المديريات)'
              : isDirector 
              ? 'منظومة التقارير الإدارية المركزية' 
              : `تقارير ${user?.departmentName} (تقاريري)`
            }
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'متابعة كافة التقارير الإدارية المرفوعة عبر جميع المديريات والمصالح'
              : isDirector
              ? 'مراجعة واعتماد التقارير اليومية والأسبوعية والشهرية الواردة من المصالح الستة'
              : 'إعداد وحفظ مسودات وإرسال التقارير الرسمية لمتابعة وضعية المصلحة'
            }
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* New Report Button (Only for Department Head) */}
          {!hasAdminView && (
            <button
              onClick={() => {
                setReportToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-900/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء تقرير جديد</span>
            </button>
          )}

          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>العودة للرئيسية</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{notification}</span>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 block">إجمالي التقارير</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.total}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {isDirector ? 'واردة من المصالح الستة' : 'خاصة بمصلحتك'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20">
            <span className="text-[11px] font-bold text-blue-700 block">تقارير جديدة (مرسلة)</span>
            <span className="text-2xl font-extrabold text-blue-900 mt-1 block">{stats.submitted}</span>
            <span className="text-[10px] text-blue-600 font-medium mt-1 block">بانتظار مراجعة الإدارة</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/20">
            <span className="text-[11px] font-bold text-rose-700 block">تحتاج إلى تعديل</span>
            <span className="text-2xl font-extrabold text-rose-900 mt-1 block">{stats.needs_revision}</span>
            <span className="text-[10px] text-rose-600 font-medium mt-1 block">ملاحظات المدير قيد المعالجة</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-700 block">تمت المراجعة والاعتماد</span>
            <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">{stats.reviewed}</span>
            <span className="text-[10px] text-emerald-600 font-medium mt-1 block">مؤرشفة ومعتمدة رسمياً</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في عنوان التقرير، المحتوى أو اسم المسؤول..."
              className="w-full pr-10 pl-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition"
            />
          </div>

          {/* Department Filter (Admin and Director) */}
          {hasAdminView && (
            <div className="w-full md:w-56 shrink-0">
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">جميع المصالح</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id.toString()}>
                    {dept.name} {dept.directorate_name ? `(${dept.directorate_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Report Type Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">جميع الأنواع</option>
              <option value="DAILY">تقارير يومية</option>
              <option value="WEEKLY">تقارير أسبوعية</option>
              <option value="MONTHLY">تقارير شهرية</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44 shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">جميع الحالات</option>
              {!isDirector && <option value="DRAFT">مسودات</option>}
              <option value="SUBMITTED">مرسلة للإدارة</option>
              <option value="NEEDS_REVISION">تحتاج لتعديل</option>
              <option value="REVIEWED">تمت المراجعة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>
              {isDirector ? 'سجل التقارير الإدارية الواردة' : 'قائمة تقارير مصلحتي'}
            </span>
          </h3>
          <span className="text-xs font-bold text-slate-500">
            عدد النتائج: {filteredReports.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>جاري استرجاع التقارير من قاعدة البيانات...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Inbox className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-700">لا توجد تقارير مطابقة للمعايير المحددة</p>
            <p className="text-xs text-slate-400">
              {!isDirector ? 'يمكنك البدء بالضغط على "إنشاء تقرير جديد" في الأعلى.' : 'لم ترسل المصالح بعد تقارير مطابقة للتصفية الحالية.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">عنوان التقرير</th>
                  {isDirector && <th className="py-3 px-4">المصلحة</th>}
                  <th className="py-3 px-4">نوع التقرير</th>
                  <th className="py-3 px-4">الفترة المغطاة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">تاريخ الإرسال / الإنشاء</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredReports.map((report, idx) => {
                  return (
                    <tr 
                      key={report.id} 
                      className={`hover:bg-slate-50/80 transition ${
                        report.status === 'NEEDS_REVISION' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                      
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedReportForDetail(report)}
                          className="text-right font-bold text-slate-900 hover:text-emerald-700 transition block text-xs"
                        >
                          {report.title}
                        </button>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>بواسطة: {report.author_name}</span>
                          {(report.attachments_count || 0) > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold">
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>{report.attachments_count} مرفق</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {isDirector && (
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{report.dept_name}</span>
                          </span>
                        </td>
                      )}

                      <td className="py-3.5 px-4">
                        <ReportTypeBadge type={report.report_type} />
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {report.report_type === 'DAILY' && (report.report_date || '—')}
                        {report.report_type === 'WEEKLY' && `${report.period_start || ''} إلى ${report.period_end || ''}`}
                        {report.report_type === 'MONTHLY' && (report.period_start || report.report_date || '—')}
                      </td>

                      <td className="py-3.5 px-4">
                        <ReportStatusBadge status={report.status} />
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        {report.submitted_at 
                          ? new Date(report.submitted_at).toLocaleDateString('ar-DZ') 
                          : new Date(report.created_at).toLocaleDateString('ar-DZ')
                        }
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Open View Detail */}
                          <button
                            onClick={() => setSelectedReportForDetail(report)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                          >
                            عرض
                          </button>

                          {/* Head actions: Edit if draft or needs revision */}
                          {!isDirector && ['DRAFT', 'NEEDS_REVISION'].includes(report.status) && (
                            <button
                              onClick={() => handleOpenEdit(report)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                              title="تعديل"
                            >
                              <FileEdit className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Report Modal */}
      <ReportFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setReportToEdit(null);
        }}
        onSuccess={handleShowNotification}
        initialReport={reportToEdit}
      />

      {/* Detail / Review Modal */}
      <ReportDetailModal
        isOpen={!!selectedReportForDetail}
        report={selectedReportForDetail}
        onClose={() => setSelectedReportForDetail(null)}
        onRefresh={handleShowNotification}
        onEditReport={handleOpenEdit}
      />

    </div>
  );
};
