import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Directive, DirectivesStats, Department } from '../types/index.ts';
import { 
  DirectivePriorityBadge, 
  DirectiveStatusBadge, 
  DirectiveTargetBadge 
} from './DirectiveBadge.tsx';
import { DirectiveFormModal } from './DirectiveFormModal.tsx';
import { DirectiveDetailModal } from './DirectiveDetailModal.tsx';
import { 
  Send, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileEdit, 
  Trash2, 
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Inbox,
  Flame,
  Users2,
  AlertTriangle
} from 'lucide-react';

interface DirectivesViewProps {
  onBack?: () => void;
}

export const DirectivesView: React.FC<DirectivesViewProps> = ({ onBack }) => {
  const { user, token } = useAuth();

  const [directives, setDirectives] = useState<Directive[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<DirectivesStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDirectiveForDetail, setSelectedDirectiveForDetail] = useState<Directive | null>(null);
  const [directiveToEdit, setDirectiveToEdit] = useState<Directive | null>(null);

  const isDirector = user?.role === 'DIRECTOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasAdminView = isDirector || isSuperAdmin;

  const fetchDirectivesData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch directives
      let url = '/api/directives?';
      if (hasAdminView && selectedDeptId !== 'ALL') {
        url += `department_id=${selectedDeptId}&`;
      }
      if (hasAdminView && selectedTargetType !== 'ALL') {
        url += `target_type=${selectedTargetType}&`;
      }
      if (selectedPriority !== 'ALL') {
        url += `priority=${selectedPriority}&`;
      }
      if (selectedStatus !== 'ALL') {
        url += `status=${selectedStatus}&`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDirectives(data.data);
      }

      // 2. Fetch stats
      const statsRes = await fetch('/api/directives/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // 3. If admin/director, fetch departments list for filters
      if (hasAdminView) {
        const deptsRes = await fetch('/api/departments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const deptsData = await deptsRes.json();
        if (deptsData.success && Array.isArray(deptsData.data)) {
          setDepartments(deptsData.data);
        }
      }
    } catch (err) {
      console.error('Failed to load directives data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectivesData();
  }, [token, selectedDeptId, selectedTargetType, selectedPriority, selectedStatus]);

  const handleShowNotification = (msg?: string) => {
    if (msg) {
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    }
    fetchDirectivesData();
  };

  const handleOpenEdit = (directive: Directive) => {
    setDirectiveToEdit(directive);
    setIsCreateModalOpen(true);
  };

  // Filter directives by search term
  const filteredDirectives = directives.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Toast Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* View Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
                title="العودة"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Send className="w-4 h-4 text-amber-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {isSuperAdmin
                ? 'نظام التوجيهات المركزية لكافة المديريات (SaaS)'
                : isDirector 
                ? 'نظام توجيهات المدير والمتابعة الإدارية' 
                : 'توجيهاتي والتعليمات الإدارية'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mr-10">
            {isSuperAdmin
              ? 'متابعة كافة التوجيهات الصادرة عن مديري الإقامات ومراحل تنفيذها عبر جميع المصالح'
              : isDirector
              ? 'إصدار التوجيهات والتعليمات الرسمية للمصالح، وتتبع مراحل اطلاعها وبدء تنفيذها وإنجازها'
              : `استعراض التوجيهات الموجهة إلى ${user?.departmentName || 'مصلحتك'} وتأكيد مراحل التنفيذ رسمياً`}
          </p>
        </div>

        {isDirector && (
          <button
            onClick={() => {
              setDirectiveToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-amber-900/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار توجيه جديد</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-medium block">إجمالي التوجيهات</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">{stats.total}</span>
          </div>

          <div className="bg-blue-50/60 rounded-xl border border-blue-200 p-3.5 shadow-2xs">
            <span className="text-[11px] text-blue-700 font-bold block">توجيهات جديدة (NEW)</span>
            <span className="text-xl font-bold text-blue-900 font-mono mt-1 block">{stats.new_count}</span>
          </div>

          <div className="bg-indigo-50/60 rounded-xl border border-indigo-200 p-3.5 shadow-2xs">
            <span className="text-[11px] text-indigo-700 font-bold block">تم الاطلاع عليها</span>
            <span className="text-xl font-bold text-indigo-900 font-mono mt-1 block">{stats.acknowledged}</span>
          </div>

          <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-3.5 shadow-2xs">
            <span className="text-[11px] text-amber-800 font-bold block">قيد التنفيذ</span>
            <span className="text-xl font-bold text-amber-900 font-mono mt-1 block">{stats.in_progress}</span>
          </div>

          <div className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
            <span className="text-[11px] text-emerald-800 font-bold block">تم التنفيذ بنجاح</span>
            <span className="text-xl font-bold text-emerald-900 font-mono mt-1 block">{stats.completed}</span>
          </div>

          <div className="bg-rose-50/60 rounded-xl border border-rose-200 p-3.5 shadow-2xs">
            <span className="text-[11px] text-rose-800 font-bold block">معادة للتصحيح</span>
            <span className="text-xl font-bold text-rose-900 font-mono mt-1 block">{stats.returned}</span>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في موضوع ونص التوجيهات الإدارية..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 transition"
            />
          </div>

          {/* Department Filter (Admin and Director) */}
          {hasAdminView && (
            <div className="w-full md:w-52">
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">جميع المصالح المستهدفة</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} {dept.directorate_name ? `(${dept.directorate_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority Filter */}
          <div className="w-full md:w-36">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">كل الأولويات</option>
              <option value="NORMAL">أولوية عادية</option>
              <option value="HIGH">أولوية هامة</option>
              <option value="URGENT">أولوية عاجلة</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">كل الحالات</option>
              <option value="NEW">جديدة (NEW)</option>
              <option value="ACKNOWLEDGED">تم الاطلاع عليها</option>
              <option value="IN_PROGRESS">قيد التنفيذ</option>
              <option value="COMPLETED">تم التنفيذ</option>
              <option value="RETURNED">معادة للتصحيح</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directives Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-600" />
            <span>
              {isDirector ? 'قائمة وسجل التوجيهات الصادرة' : 'التوجيهات والتعليمات الموجهة لمصلحتي'}
            </span>
          </h3>
          <span className="text-xs font-bold text-slate-500">
            عدد النتائج: {filteredDirectives.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>جاري استرجاع التوجيهات من قاعدة البيانات...</span>
          </div>
        ) : filteredDirectives.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Inbox className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-700">لا توجد توجيهات إدارية مطابقة للمعايير المحددة</p>
            <p className="text-xs text-slate-400">
              {isDirector
                ? 'يمكنك البدء بالضغط على "إصدار توجيه جديد" في الأعلى.'
                : 'لم تصدر إدارة الإقامة الجامعية توجيهات جديدة لمصلحتك حالياً.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">موضوع التوجيه</th>
                  <th className="py-3 px-4">الجهة المستهدفة</th>
                  <th className="py-3 px-4">الأولوية</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">تاريخ الإصدار</th>
                  <th className="py-3 px-4">أجل الاستحقاق</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDirectives.map((directive, idx) => (
                  <tr 
                    key={directive.id}
                    className={`hover:bg-slate-50/80 transition ${
                      directive.status === 'RETURNED' ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedDirectiveForDetail(directive)}
                        className="text-right font-bold text-slate-900 hover:text-amber-800 transition block text-xs"
                      >
                        {directive.title}
                      </button>
                      <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                        {directive.content}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <DirectiveTargetBadge 
                        targetType={directive.target_type} 
                        deptName={directive.target_dept_name} 
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <DirectivePriorityBadge priority={directive.priority} />
                    </td>

                    <td className="py-3.5 px-4">
                      <DirectiveStatusBadge status={directive.status} />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {new Date(directive.created_at).toLocaleDateString('ar-DZ')}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-800 text-[11px]">
                      {directive.due_date ? new Date(directive.due_date).toLocaleDateString('ar-DZ') : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedDirectiveForDetail(directive)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                        >
                          عرض التفاصيل
                        </button>

                        {isDirector && directive.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenEdit(directive)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="تعديل التوجيه"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <DirectiveFormModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setDirectiveToEdit(null);
          }}
          onSuccess={handleShowNotification}
          initialDirective={directiveToEdit}
        />
      )}

      {selectedDirectiveForDetail && (
        <DirectiveDetailModal
          directive={selectedDirectiveForDetail}
          isOpen={!!selectedDirectiveForDetail}
          onClose={() => setSelectedDirectiveForDetail(null)}
          onRefresh={handleShowNotification}
          onEditDirective={handleOpenEdit}
        />
      )}

    </div>
  );
};
