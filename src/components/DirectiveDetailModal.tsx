import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Directive, DirectiveDepartmentStatus, DirectiveDepartmentsSummary } from '../types/index.ts';
import { 
  DirectivePriorityBadge, 
  DirectiveStatusBadge, 
  DirectiveTargetBadge 
} from './DirectiveBadge.tsx';
import { 
  X, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileEdit, 
  Trash2, 
  RotateCcw,
  PlayCircle,
  Eye,
  Loader2,
  Users2,
  Stethoscope,
  Brain,
  Utensils,
  Wrench,
  ShieldCheck,
  Building
} from 'lucide-react';

interface DirectiveDetailModalProps {
  directive: Directive | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: (msg?: string) => void;
  onEditDirective?: (directive: Directive) => void;
}

export const DirectiveDetailModal: React.FC<DirectiveDetailModalProps> = ({
  directive,
  isOpen,
  onClose,
  onRefresh,
  onEditDirective
}) => {
  const { user, token } = useAuth();
  const [detailDirective, setDetailDirective] = useState<Directive | null>(directive);
  const [departmentsStatus, setDepartmentsStatus] = useState<DirectiveDepartmentStatus[]>([]);
  const [departmentsSummary, setDepartmentsSummary] = useState<DirectiveDepartmentsSummary | null>(null);
  const [myStatus, setMyStatus] = useState<DirectiveDepartmentStatus | null>(null);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Return prompt modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTargetDeptId, setReturnTargetDeptId] = useState<number | null>(null);
  const [returnNotes, setReturnNotes] = useState('');

  const isDirector = user?.role === 'DIRECTOR';
  const isTargetHead = user?.role === 'DEPARTMENT_HEAD' && (directive?.target_type === 'ALL' || directive?.target_department_id === user.departmentId);

  // Load fresh details and department tracking upon modal opening
  const fetchFreshDetails = async () => {
    if (!directive || !isOpen) return;
    setIsLoadingDetail(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/directives/${directive.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDetailDirective(data.data);
        if (data.data.my_status) {
          setMyStatus(data.data.my_status);
        }
        if (data.data.departments_status) {
          setDepartmentsStatus(data.data.departments_status);
        }
        if (data.data.departments_summary) {
          setDepartmentsSummary(data.data.departments_summary);
        }
      }

      // If Director, ensure latest departments status from dedicated endpoint
      if (isDirector) {
        const ddsRes = await fetch(`/api/directives/${directive.id}/departments-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ddsData = await ddsRes.json();
        if (ddsData.success) {
          setDepartmentsStatus(ddsData.departments || []);
          setDepartmentsSummary(ddsData.summary || null);
        }
      } else if (isTargetHead) {
        // If Department Head, ensure latest my-status
        const myRes = await fetch(`/api/directives/${directive.id}/my-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const myData = await myRes.json();
        if (myData.success && myData.data) {
          setMyStatus(myData.data);
        }
      }
    } catch (err) {
      console.error('Failed to load fresh directive details:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (isOpen && directive) {
      setDetailDirective(directive);
      setMyStatus(directive.my_status || null);
      setDepartmentsStatus(directive.departments_status || []);
      setDepartmentsSummary(directive.departments_summary || null);
      fetchFreshDetails();
    } else {
      setDetailDirective(null);
      setMyStatus(null);
      setDepartmentsStatus([]);
      setDepartmentsSummary(null);
      setErrorMsg(null);
    }
  }, [isOpen, directive?.id, token]);

  if (!isOpen || !directive) return null;

  const currentDirective = detailDirective || directive;
  const currentStatus = isDirector 
    ? currentDirective.status 
    : (myStatus?.status || currentDirective.status);

  // 1. Department Head: Acknowledge ("تم الاطلاع")
  const handleAcknowledge = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/directives/${currentDirective.id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل تأكيد الاطلاع');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      onRefresh('تم تأكيد الاطلاع على التوجيه بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  // 2. Department Head: Start Execution ("بدء التنفيذ")
  const handleStart = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/directives/${currentDirective.id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل تسجيل بدء التنفيذ');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      onRefresh('تم تسجيل بدء تنفيذ التوجيه الإداري');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  // 3. Department Head: Complete Execution ("تم التنفيذ")
  const handleComplete = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/directives/${currentDirective.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل تأكيد إتمام التنفيذ');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      onRefresh('تم تأكيد إنجاز وتنفيذ التوجيه الإداري بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  // 4. Director: Return for correction ("إعادة التوجيه للتصحيح")
  const handleReturn = async () => {
    if (!returnNotes.trim()) {
      setErrorMsg('يرجى توضيح ملاحظات وتوجيهات التصحيح (حقل إلزامي)');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const payload: any = { return_notes: returnNotes.trim() };
      if (returnTargetDeptId) {
        payload.department_id = returnTargetDeptId;
      }

      const res = await fetch(`/api/directives/${currentDirective.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل إعادة التوجيه للتصحيح');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      setShowReturnModal(false);
      setReturnNotes('');
      setReturnTargetDeptId(null);
      onRefresh('تمت إعادة التوجيه للتصحيح بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  // 5. Director: Delete directive
  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التوجيه الإداري نهائياً؟')) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/directives/${currentDirective.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل حذف التوجيه');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      onRefresh('تم حذف التوجيه الإداري بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  const getDeptIcon = (code?: string) => {
    switch (code) {
      case 'medical': return <Stethoscope className="w-4 h-4 text-rose-500" />;
      case 'housing': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'psychology': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'catering': return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'security': return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      default: return <Building className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <DirectivePriorityBadge priority={currentDirective.priority} size="md" />
              <DirectiveStatusBadge status={currentStatus} size="md" />
              <DirectiveTargetBadge targetType={currentDirective.target_type} deptName={currentDirective.target_dept_name} size="md" />
              <span className="text-[11px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                توجيه #{currentDirective.id}
              </span>
              {isLoadingDetail && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  <span>جاري المزامنة...</span>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {currentDirective.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Department Head: Special Banner on own department status */}
          {!isDirector && myStatus && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    متابعة خاصة بمصلحتكم: {user?.departmentName}
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    الحالة الحالية لتنفيذ هذا التوجيه بمصلحتكم
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">حالة المصلحة:</span>
                <DirectiveStatusBadge status={myStatus.status} size="sm" />
              </div>
            </div>
          )}

          {/* Director Return Notes Alert if RETURNED */}
          {currentStatus === 'RETURNED' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-800 text-xs">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>ملاحظات وتوجيهات المدير لإعادة التصحيح:</span>
              </div>
              <p className="text-xs text-rose-900 bg-white/90 p-3 rounded-lg border border-rose-200 leading-relaxed font-medium">
                {currentDirective.return_notes || myStatus?.return_notes || 'يرجى مراجعة وتصحيح تنفيذ هذا التوجيه وفق التعليمات المطلوبة.'}
              </p>
              {(currentDirective.returned_at || myStatus?.returned_at) && (
                <span className="text-[11px] font-mono text-rose-700 block">
                  تاريخ الإعادة: {new Date(currentDirective.returned_at || myStatus?.returned_at!).toLocaleDateString('ar-DZ')}
                  {(myStatus?.returned_by_name) && ` — بواسطة: ${myStatus.returned_by_name}`}
                </span>
              )}
            </div>
          )}

          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">الجهة المستهدفة:</span>
              <span className="font-bold text-slate-900 mt-0.5 block">
                {currentDirective.target_type === 'ALL' ? 'جميع المصالح (عام)' : currentDirective.target_dept_name}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">صادر من:</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{currentDirective.creator_name || 'مدير الإقامة الجامعية'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">تاريخ الإصدار:</span>
              <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                {new Date(currentDirective.created_at).toLocaleDateString('ar-DZ')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">أجل الاستحقاق:</span>
              <span className="font-bold text-amber-900 mt-0.5 block font-mono">
                {currentDirective.due_date ? new Date(currentDirective.due_date).toLocaleDateString('ar-DZ') : 'غير محدد'}
              </span>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
              <span>نص التوجيه والتعليمات الإدارية:</span>
              <span className="text-[10px] text-slate-400">وثيقة إدارية ملزمة</span>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {currentDirective.content}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 7 & 8: DIRECTOR VIEW FOR GENERAL DIRECTIVE ALL   */}
          {/* "متابعة المصالح" (All 6 Departments Tracking & Summary) */}
          {/* ======================================================== */}
          {isDirector && (currentDirective.target_type === 'ALL' || departmentsStatus.length > 1) && (
            <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 space-y-3.5">
              
              {/* Header & Stats Summary */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Users2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        متابعة المصالح (التوجيه العام)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        متابعة حية ومستقلة لحالة استلام وتنفيذ كل مصلحة من المصالح الست
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                    إجمالي المصالح: {departmentsSummary?.total || departmentsStatus.length || 6}
                  </span>
                </div>

                {/* Summary numbers bar */}
                {departmentsSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-blue-200 text-center bg-blue-50/30">
                      <span className="text-[10px] text-blue-700 font-bold block">لم تطلع (جديد)</span>
                      <span className="text-base font-black text-blue-900">{departmentsSummary.new_count}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-200 text-center bg-indigo-50/30">
                      <span className="text-[10px] text-indigo-700 font-bold block">تم الاطلاع</span>
                      <span className="text-base font-black text-indigo-900">{departmentsSummary.acknowledged}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-amber-200 text-center bg-amber-50/30">
                      <span className="text-[10px] text-amber-700 font-bold block">قيد التنفيذ</span>
                      <span className="text-base font-black text-amber-900">{departmentsSummary.in_progress}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center bg-emerald-50/30">
                      <span className="text-[10px] text-emerald-700 font-bold block">تم التنفيذ</span>
                      <span className="text-base font-black text-emerald-900">{departmentsSummary.completed}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-rose-200 text-center bg-rose-50/30">
                      <span className="text-[10px] text-rose-700 font-bold block">معادة للتصحيح</span>
                      <span className="text-base font-black text-rose-900">{departmentsSummary.returned}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid of the 6 Departments Tracking Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {departmentsStatus.map((dept) => (
                  <div 
                    key={dept.department_id}
                    className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-2.5 hover:border-slate-300 transition"
                  >
                    {/* Dept Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                          {getDeptIcon(dept.dept_code)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {dept.dept_name || `المصلحة #${dept.department_id}`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            كود: {dept.dept_code || `#${dept.department_id}`}
                          </span>
                        </div>
                      </div>
                      <DirectiveStatusBadge status={dept.status} size="sm" />
                    </div>

                    {/* Step details */}
                    <div className="space-y-1.5 text-[11px]">
                      {/* 1. الاطلاع */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 font-medium">الاطلاع:</span>
                        {dept.acknowledged_at ? (
                          <div className="text-left">
                            <span className="text-slate-800 font-bold">
                              تم بواسطة: {dept.acknowledged_by_name || 'رئيس المصلحة'}
                            </span>
                            <span className="text-slate-500 font-mono text-[10px] block">
                              {new Date(dept.acknowledged_at).toLocaleDateString('ar-DZ')} {new Date(dept.acknowledged_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">لم يتم الاطلاع</span>
                        )}
                      </div>

                      {/* 2. بدء التنفيذ */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 font-medium">بدء التنفيذ:</span>
                        {dept.started_at ? (
                          <div className="text-left">
                            <span className="text-amber-900 font-bold">
                              بدأ بواسطة: {dept.started_by_name || 'رئيس المصلحة'}
                            </span>
                            <span className="text-slate-500 font-mono text-[10px] block">
                              {new Date(dept.started_at).toLocaleDateString('ar-DZ')} {new Date(dept.started_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">لم يبدأ بعد</span>
                        )}
                      </div>

                      {/* 3. إتمام التنفيذ */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 font-medium">إتمام التنفيذ:</span>
                        {dept.completed_at ? (
                          <div className="text-left">
                            <span className="text-emerald-800 font-bold">
                              أنجز بواسطة: {dept.completed_by_name || 'رئيس المصلحة'}
                            </span>
                            <span className="text-slate-500 font-mono text-[10px] block">
                              {new Date(dept.completed_at).toLocaleDateString('ar-DZ')} {new Date(dept.completed_at).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">لم يكتمل بعد</span>
                        )}
                      </div>

                      {/* 4. الإعادة إن وجدت */}
                      {dept.status === 'RETURNED' && (
                        <div className="pt-1 border-t border-rose-100 text-rose-900">
                          <span className="font-bold block">ملاحظات الإعادة:</span>
                          <span className="text-[10px] block bg-rose-50/80 p-1.5 rounded text-rose-950 mt-0.5">
                            {dept.return_notes || 'أعيد للتصحيح'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action button: Return this specific department if in progress or completed */}
                    {dept.status !== 'NEW' && dept.status !== 'RETURNED' && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setReturnTargetDeptId(dept.department_id);
                            setReturnNotes('');
                            setShowReturnModal(true);
                          }}
                          className="text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>إعادة هذه المصلحة للتصحيح</span>
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* EXECUTION TIMELINE (For Specific Dept or Dept Head view) */}
          {/* ======================================================== */}
          {(!isDirector || currentDirective.target_type === 'DEPARTMENT') && (
            <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 space-y-2.5">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>
                  {isDirector 
                    ? `سجل ومتابعة مراحل التنفيذ — ${currentDirective.target_dept_name || 'المصلحة'}`
                    : `سجل ومتابعة مراحل التنفيذ بمصلحتكم (${user?.departmentName})`
                  }
                </span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* 1. تاريخ الإصدار */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">1. تاريخ الإصدار:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] mt-0.5 block">
                    {new Date(currentDirective.created_at).toLocaleDateString('ar-DZ')}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    بواسطة: {currentDirective.creator_name || 'المدير'}
                  </span>
                </div>

                {/* 2. تم الاطلاع */}
                <div className={`p-2.5 rounded-lg border ${
                  (myStatus?.acknowledged_at || currentDirective.acknowledged_at) ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <span className="text-[10px] block font-medium">2. تم الاطلاع:</span>
                  <span className="font-mono font-bold text-[11px] mt-0.5 block">
                    {(myStatus?.acknowledged_at || currentDirective.acknowledged_at)
                      ? new Date(myStatus?.acknowledged_at || currentDirective.acknowledged_at!).toLocaleDateString('ar-DZ') 
                      : 'لم يتم بعد'
                    }
                  </span>
                  {(myStatus?.acknowledged_by_name) && (
                    <span className="text-[10px] text-indigo-800 font-bold block truncate">
                      بواسطة: {myStatus.acknowledged_by_name}
                    </span>
                  )}
                </div>

                {/* 3. بدأ التنفيذ */}
                <div className={`p-2.5 rounded-lg border ${
                  (myStatus?.started_at || currentDirective.started_at) ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <span className="text-[10px] block font-medium">3. بدأ التنفيذ:</span>
                  <span className="font-mono font-bold text-[11px] mt-0.5 block">
                    {(myStatus?.started_at || currentDirective.started_at) 
                      ? new Date(myStatus?.started_at || currentDirective.started_at!).toLocaleDateString('ar-DZ') 
                      : 'لم يبدأ بعد'
                    }
                  </span>
                  {(myStatus?.started_by_name) && (
                    <span className="text-[10px] text-amber-800 font-bold block truncate">
                      بواسطة: {myStatus.started_by_name}
                    </span>
                  )}
                </div>

                {/* 4. تم التنفيذ */}
                <div className={`p-2.5 rounded-lg border ${
                  (myStatus?.completed_at || currentDirective.completed_at) ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <span className="text-[10px] block font-medium">4. تم التنفيذ:</span>
                  <span className="font-mono font-bold text-[11px] mt-0.5 block">
                    {(myStatus?.completed_at || currentDirective.completed_at) 
                      ? new Date(myStatus?.completed_at || currentDirective.completed_at!).toLocaleDateString('ar-DZ') 
                      : 'قيد المتابعة'
                    }
                  </span>
                  {(myStatus?.completed_by_name) && (
                    <span className="text-[10px] text-emerald-800 font-bold block truncate">
                      بواسطة: {myStatus.completed_by_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            إغلاق
          </button>

          {/* ACTIONS FOR DEPARTMENT HEAD (Acts on own department status) */}
          {isTargetHead && (
            <div className="flex items-center gap-2">
              {/* Step 1: Acknowledge */}
              {currentStatus === 'NEW' && (
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-4 h-4" />}
                  <span>تأكيد الاطلاع</span>
                </button>
              )}

              {/* Step 2: Start Execution */}
              {(currentStatus === 'ACKNOWLEDGED' || currentStatus === 'RETURNED') && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  <span>بدء التنفيذ</span>
                </button>
              )}

              {/* Step 3: Complete Execution */}
              {currentStatus === 'IN_PROGRESS' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-900/10"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>تم التنفيذ</span>
                </button>
              )}

              {/* Completed Badge */}
              {currentStatus === 'COMPLETED' && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم تنفيذ هذا التوجيه بالكامل لمصلحتكم</span>
                </span>
              )}
            </div>
          )}

          {/* ACTIONS FOR DIRECTOR */}
          {isDirector && (
            <div className="flex items-center gap-2">
              {/* Delete (only if NEW or RETURNED) */}
              {['NEW', 'RETURNED'].includes(currentDirective.status) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف التوجيه</span>
                </button>
              )}

              {/* Edit (if not COMPLETED) */}
              {currentDirective.status !== 'COMPLETED' && onEditDirective && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditDirective(currentDirective);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </button>
              )}

              {/* Return for correction (Overall) */}
              {currentDirective.status !== 'NEW' && currentDirective.status !== 'RETURNED' && (
                <button
                  type="button"
                  onClick={() => {
                    setReturnTargetDeptId(null);
                    setReturnNotes(currentDirective.return_notes || '');
                    setShowReturnModal(true);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                  <span>إعادة التوجيه للتصحيح</span>
                </button>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Return for Correction Prompt Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-60 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-rose-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  إعادة التوجيه للتصحيح
                </h4>
                {returnTargetDeptId && (
                  <span className="text-[11px] text-rose-700 font-bold block">
                    مخصص للمصلحة رقم #{returnTargetDeptId}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              يرجى كتابة ملاحظات وتوجيهات التصحيح الواجب على رئيس المصلحة استدراكها:
            </p>

            <textarea
              rows={4}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="مثال: يرجى استكمال إجراءات الجرد قبل نهاية الأسبوع وموافاة الإدارة بالتقرير النهائي..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white text-slate-800 mb-4"
              required
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnTargetDeptId(null);
                  setReturnNotes('');
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={isProcessing}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {isProcessing ? 'جاري الإرسال...' : 'تأكيد إعادة التوجيه'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
