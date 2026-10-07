import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Building, 
  Building2, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  Plus, 
  Edit3, 
  Power, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  RefreshCw, 
  KeyRound, 
  Mail, 
  Phone, 
  Lock, 
  Clock, 
  SlidersHorizontal,
  ChevronLeft,
  X,
  FileCheck
} from 'lucide-react';
import { Directorate, Subscription, Department, User, UserRole } from '../types/index.ts';

interface DirectorateManagementViewProps {
  directorateId: number;
  onBack: () => void;
}

export const DirectorateManagementView: React.FC<DirectorateManagementViewProps> = ({
  directorateId,
  onBack
}) => {
  const { user, token } = useAuth();

  // Active section tab
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'director' | 'heads' | 'subscription'>('overview');

  // Data states
  const [directorate, setDirectorate] = useState<Directorate | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [director, setDirector] = useState<User | null>(null);
  const [departmentHeads, setDepartmentHeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  // 1. Department Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'Building2'
  });

  // 2. Director Modal
  const [showDirectorModal, setShowDirectorModal] = useState(false);
  const [directorModalMode, setDirectorModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [directorForm, setDirectorForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: ''
  });

  // 3. Department Head Modal
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [headModalMode, setHeadModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingHead, setEditingHead] = useState<any | null>(null);
  const [headForm, setHeadForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    department_id: ''
  });

  // 4. Subscription Edit Modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState({
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'SUSPENDED',
    plan_name: 'PRO_ENTERPRISE',
    start_date: '',
    end_date: '',
    notes: ''
  });

  // 5. Subscription Renew Modal
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState({
    plan_name: 'PRO_ENTERPRISE',
    end_date: '',
    notes: ''
  });

  // Security check: only SUPER_ADMIN is allowed
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold">وصول غير مصرح به</h3>
        <p className="text-sm">هذه الصفحة مخصصة حصرياً للمشرف العام على المنصة (SUPER_ADMIN).</p>
        <button
          onClick={onBack}
          className="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          العودة
        </button>
      </div>
    );
  }

  // Fetch full details of this directorate
  const fetchDirectorateDetails = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/directorates/${directorateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تحميل بيانات المديرية');
        return;
      }

      setDirectorate(data.data.directorate);
      setSubscription(data.data.subscription);
      setDepartments(data.data.departments || []);
      setDirector(data.data.director);
      setDepartmentHeads(data.data.departmentHeads || []);
      setStats(data.data.stats || {});
    } catch (err: any) {
      console.error('Fetch directorate detail error:', err);
      setActionError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (directorateId && token) {
      fetchDirectorateDetails();
    }
  }, [directorateId, token]);

  // Toast auto-clear
  useEffect(() => {
    if (actionSuccess || actionError) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
        setActionError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess, actionError]);

  // Handlers: Directorate Status Toggle
  const handleToggleDirStatus = async () => {
    if (!directorate) return;
    try {
      const res = await fetch(`/api/admin/directorates/${directorate.id}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تغيير حالة المديرية');
        return;
      }
      setActionSuccess(data.message);
      fetchDirectorateDetails();
    } catch {
      setActionError('فشل تغيير حالة المديرية');
    }
  };

  // Handlers: Departments
  const handleOpenCreateDept = () => {
    setDeptModalMode('CREATE');
    setEditingDept(null);
    setDeptForm({
      code: '',
      name: '',
      description: '',
      icon: 'Building2'
    });
    setShowDeptModal(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setDeptModalMode('EDIT');
    setEditingDept(dept);
    setDeptForm({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
      icon: dept.icon || 'Building2'
    });
    setShowDeptModal(true);
  };

  const handleSubmitDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const url = deptModalMode === 'CREATE'
        ? '/api/admin/departments'
        : `/api/admin/departments/${editingDept?.id}`;
      const method = deptModalMode === 'CREATE' ? 'POST' : 'PUT';

      const payload = {
        directorate_id: directorateId,
        code: deptForm.code,
        name: deptForm.name,
        description: deptForm.description,
        icon: deptForm.icon
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشلت عملية حفظ المصلحة');
        return;
      }
      setActionSuccess(data.message);
      setShowDeptModal(false);
      fetchDirectorateDetails();
    } catch {
      setActionError('حدث خطأ أثناء حفظ المصلحة');
    }
  };

  const handleToggleDeptStatus = async (deptId: number) => {
    try {
      const res = await fetch(`/api/admin/departments/${deptId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تغيير حالة المصلحة');
        return;
      }
      setActionSuccess(data.message);
      fetchDirectorateDetails();
    } catch {
      setActionError('فشل تغيير حالة المصلحة');
    }
  };

  // Handlers: Director Account
  const handleOpenCreateDirector = () => {
    setDirectorModalMode('CREATE');
    setDirectorForm({
      full_name: '',
      username: '',
      email: '',
      phone: '',
      password: ''
    });
    setShowDirectorModal(true);
  };

  const handleOpenEditDirector = () => {
    if (!director) return;
    setDirectorModalMode('EDIT');
    setDirectorForm({
      full_name: director.fullName || (director as any).full_name || '',
      username: director.username || '',
      email: director.email || '',
      phone: director.phone || '',
      password: ''
    });
    setShowDirectorModal(true);
  };

  const handleSubmitDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (directorModalMode === 'CREATE') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...directorForm,
            role: 'DIRECTOR',
            directorate_id: directorateId
          })
        });
        const data = await res.json();
        if (!data.success) {
          setActionError(data.error || 'فشل إنشاء حساب المدير');
          return;
        }
        setActionSuccess(data.message);
      } else {
        if (!director) return;
        const res = await fetch(`/api/admin/users/${director.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            full_name: directorForm.full_name,
            email: directorForm.email,
            phone: directorForm.phone,
            password: directorForm.password || undefined,
            role: 'DIRECTOR',
            directorate_id: directorateId
          })
        });
        const data = await res.json();
        if (!data.success) {
          setActionError(data.error || 'فشل تعديل حساب المدير');
          return;
        }
        setActionSuccess(data.message);
      }

      setShowDirectorModal(false);
      fetchDirectorateDetails();
    } catch {
      setActionError('حدث خطأ أثناء معالجة حساب المدير');
    }
  };

  const handleToggleDirectorStatus = async () => {
    if (!director) return;
    try {
      const res = await fetch(`/api/admin/users/${director.id}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تغيير حالة حساب المدير');
        return;
      }
      setActionSuccess(data.message);
      fetchDirectorateDetails();
    } catch {
      setActionError('فشل تغيير حالة حساب المدير');
    }
  };

  // Handlers: Department Heads
  const handleOpenCreateHead = () => {
    setHeadModalMode('CREATE');
    setEditingHead(null);
    setHeadForm({
      full_name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      department_id: departments.length > 0 ? departments[0].id.toString() : ''
    });
    setShowHeadModal(true);
  };

  const handleOpenEditHead = (head: any) => {
    setHeadModalMode('EDIT');
    setEditingHead(head);
    setHeadForm({
      full_name: head.full_name || head.fullName || '',
      username: head.username || '',
      email: head.email || '',
      phone: head.phone || '',
      password: '',
      department_id: head.department_id ? head.department_id.toString() : ''
    });
    setShowHeadModal(true);
  };

  const handleSubmitHead = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (!headForm.department_id) {
        setActionError('يجب اختيار مصلحة تابعة لهذه المديرية');
        return;
      }

      if (headModalMode === 'CREATE') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            full_name: headForm.full_name,
            username: headForm.username,
            email: headForm.email,
            phone: headForm.phone,
            password: headForm.password,
            role: 'DEPARTMENT_HEAD',
            directorate_id: directorateId,
            department_id: parseInt(headForm.department_id, 10)
          })
        });
        const data = await res.json();
        if (!data.success) {
          setActionError(data.error || 'فشل إنشاء حساب رئيس المصلحة');
          return;
        }
        setActionSuccess(data.message);
      } else {
        if (!editingHead) return;
        const res = await fetch(`/api/admin/users/${editingHead.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            full_name: headForm.full_name,
            email: headForm.email,
            phone: headForm.phone,
            password: headForm.password || undefined,
            role: 'DEPARTMENT_HEAD',
            directorate_id: directorateId,
            department_id: parseInt(headForm.department_id, 10)
          })
        });
        const data = await res.json();
        if (!data.success) {
          setActionError(data.error || 'فشل تعديل حساب رئيس المصلحة');
          return;
        }
        setActionSuccess(data.message);
      }

      setShowHeadModal(false);
      fetchDirectorateDetails();
    } catch {
      setActionError('حدث خطأ أثناء معالجة حساب رئيس المصلحة');
    }
  };

  const handleToggleHeadStatus = async (headId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${headId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تغيير حالة الحساب');
        return;
      }
      setActionSuccess(data.message);
      fetchDirectorateDetails();
    } catch {
      setActionError('فشل تغيير حالة الحساب');
    }
  };

  // Handlers: Subscription
  const handleOpenEditSub = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setSubForm({
      status: subscription?.status || (directorate?.subscription_status as any) || 'ACTIVE',
      plan_name: subscription?.plan_name || directorate?.subscription_plan || 'PRO_ENTERPRISE',
      start_date: subscription?.start_date || directorate?.subscription_start_date || today,
      end_date: subscription?.end_date || directorate?.subscription_end_date || nextYear,
      notes: subscription?.notes || ''
    });
    setShowSubModal(true);
  };

  const handleSubmitSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/directorates/${directorateId}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(subForm)
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تحديث بيانات الاشتراك');
        return;
      }
      setActionSuccess(data.message);
      setShowSubModal(false);
      fetchDirectorateDetails();
    } catch {
      setActionError('حدث خطأ أثناء حفظ الاشتراك');
    }
  };

  const handleOpenRenewSub = () => {
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    setRenewForm({
      plan_name: subscription?.plan_name || 'PRO_ENTERPRISE',
      end_date: nextYear,
      notes: `تجديد سنوي معتمد من المشرف العام بتاريخ ${today}`
    });
    setShowRenewModal(true);
  };

  const handleSubmitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/directorates/${directorateId}/subscription/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(renewForm)
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تجديد الاشتراك');
        return;
      }
      setActionSuccess(data.message);
      setShowRenewModal(false);
      fetchDirectorateDetails();
    } catch {
      setActionError('حدث خطأ أثناء تجديد الاشتراك');
    }
  };

  if (isLoading && !directorate) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-sm font-bold text-slate-600">جاري تحميل بيانات المديرية...</span>
      </div>
    );
  }

  if (!directorate) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-lg font-bold">المديرية غير موجودة</h3>
        <p className="text-sm">لم يتم العثور على المديرية المطلوبة.</p>
        <button
          onClick={onBack}
          className="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          العودة للقائمة
        </button>
      </div>
    );
  }

  const isSubActive = (subscription?.status || directorate.subscription_status) === 'ACTIVE';
  const subStatus = subscription?.status || directorate.subscription_status || 'ACTIVE';
  const subStartDate = subscription?.start_date || directorate.subscription_start_date || 'غير محدد';
  const subEndDate = subscription?.end_date || directorate.subscription_end_date || 'غير محدد';

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Top Breadcrumb & Back Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
        >
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <span>العودة إلى دليل المديريات</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
            إدارة مخصصة للمشرف العام (SUPER_ADMIN)
          </span>
          <button
            onClick={fetchDirectorateDetails}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl border border-slate-200 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* REQUIREMENT 2: Top Directorate Information Header */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-700" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-inner ${
              directorate.is_active === 1 ? 'bg-indigo-600 text-white' : 'bg-red-500 text-white'
            }`}>
              <Building className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {directorate.name}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                  {directorate.code}
                </span>
                <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${
                  directorate.is_active === 1
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  {directorate.is_active === 1 ? 'المديرية مفعلة' : 'المديرية معطلة'}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                {directorate.description || 'لا يوجد وصف تفصيلي مسجل لهذه المديرية.'}
              </p>
            </div>
          </div>

          {/* Quick Action in Header */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleToggleDirStatus}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                directorate.is_active === 1
                  ? 'border-red-200 text-red-700 hover:bg-red-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{directorate.is_active === 1 ? 'تعطيل المديرية' : 'تفعيل المديرية'}</span>
            </button>
            <button
              onClick={handleOpenEditSub}
              className="py-2 px-3.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-2"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>إدارة الاشتراك</span>
            </button>
          </div>
        </div>

        {/* Top Details & Subscription Bar (Requirement 2 Details) */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">اسم المديرية:</span>
            <span className="text-xs font-extrabold text-slate-800 truncate block">{directorate.name}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">كود المديرية:</span>
            <span className="text-xs font-mono font-extrabold text-indigo-700 block">{directorate.code}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">حالة المديرية:</span>
            <span className={`text-xs font-bold block ${directorate.is_active === 1 ? 'text-emerald-700' : 'text-red-700'}`}>
              {directorate.is_active === 1 ? 'مفعلة ونشطة' : 'معطلة'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">حالة الاشتراك:</span>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md inline-block ${
              subStatus === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800'
                : subStatus === 'SUSPENDED'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {subStatus}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">بداية الاشتراك:</span>
            <span className="text-xs font-mono font-bold text-slate-700 block">{subStartDate}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">نهاية الاشتراك:</span>
            <span className="text-xs font-mono font-bold text-slate-700 block">{subEndDate}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs inside Directorate Management */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>نظرة عامة وهيكلة المديرية</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>المصالح التابعة ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('director')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'director'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>حساب المدير ({director ? director.fullName || (director as any).full_name : 'غير معيّن'})</span>
        </button>

        <button
          onClick={() => setActiveTab('heads')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'heads'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>رؤساء المصالح ({departmentHeads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'subscription'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>إدارة الاشتراك والتراخيص</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">المصالح التابعة</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{departments.length} مصالح</div>
              <div className="text-[11px] text-slate-400 mt-1">تتبع حصرياً لهذه المديرية</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">حساب مدير المديرية</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-sm font-extrabold text-slate-900 truncate">
                {director ? (director.fullName || (director as any).full_name) : 'غير معيّن'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {director ? (director.is_active === 0 || director.isActive === false ? 'معطل' : 'مفعّل ونشط') : 'مدير واحد معتمد'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">رؤساء المصالح</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{departmentHeads.length} رؤساء</div>
              <div className="text-[11px] text-slate-400 mt-1">مرتبطون بالمصالح المخصصة</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">خطة الاشتراك</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {subscription?.plan_name || directorate.subscription_plan || 'PRO_ENTERPRISE'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">ينتهي في: {subEndDate}</div>
            </div>
          </div>

          {/* Quick Shortcuts to Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setActiveTab('departments')}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">المصالح التابعة للمديرية</h4>
              <p className="text-xs text-slate-500">إضافة وتعديل وتعطيل المصالح التابعة حصرياً لهذه المديرية.</p>
            </div>

            <div 
              onClick={() => setActiveTab('director')}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                  <UserCheck className="w-5 h-5" />
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">حساب مدير المديرية</h4>
              <p className="text-xs text-slate-500">إنشاء وتعيين وتفعيل مدير واحد مفعّل لهذه المديرية.</p>
            </div>

            <div 
              onClick={() => setActiveTab('heads')}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Users className="w-5 h-5" />
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">رؤساء المصالح</h4>
              <p className="text-xs text-slate-500">إنشاء حسابات رؤساء المصالح وربط كل رئيس بمصلحة محددة داخل هذه المديرية.</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REQUIREMENT 3: DEPARTMENTS SECTION */}
      {/* ======================================================== */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>مصالح {directorate.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعرض هذه القائمة المصالح التابعة حصرياً لهذه المديرية (لا تظهر مصالح أي مديرية أخرى).
              </p>
            </div>

            <button
              onClick={handleOpenCreateDept}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مصلحة</span>
            </button>
          </div>

          {departments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">لا توجد مصالح مسجلة لهذه المديرية حالياً</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                قم بإنشاء المصالح التابعة لهذه المديرية (مثل مصلحة الإطعام، مصلحة الإيواء، مصلحة الطب، مصلحة الصيانة).
              </p>
              <button
                onClick={handleOpenCreateDept}
                className="mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition inline-flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة أول مصلحة الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept: any) => {
                const isDeptActive = dept.is_active === 1;
                return (
                  <div
                    key={dept.id}
                    className={`bg-white rounded-2xl p-5 border transition shadow-2xs flex flex-col justify-between ${
                      isDeptActive ? 'border-slate-200/90' : 'border-red-200 bg-red-50/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isDeptActive ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">{dept.name}</h4>
                            <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {dept.code}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isDeptActive 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {isDeptActive ? 'مفعلة' : 'معطلة'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                        {dept.description || 'لا يوجد وصف تفصيلي مسجل.'}
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">رئيس المصلحة:</span>
                          <span className="font-bold text-slate-800">
                            {dept.head_name || 'غير معين'}
                          </span>
                        </div>
                        {dept.head_username && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                            <span>اسم المستخدم:</span>
                            <span>{dept.head_username}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenEditDept(dept)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>تعديل</span>
                      </button>

                      <button
                        onClick={() => handleToggleDeptStatus(dept.id)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border ${
                          isDeptActive
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={isDeptActive ? 'تعطيل المصلحة' : 'تفعيل المصلحة'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{isDeptActive ? 'تعطيل' : 'تفعيل'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* REQUIREMENT 4: DIRECTOR ACCOUNT SECTION */}
      {/* ======================================================== */}
      {activeTab === 'director' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>حساب مدير المديرية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تخصيص مدير واحد مفعّل لهذه المديرية (يمنع النظام وجود أكثر من مدير فعّال للمديرية الواحدة).
              </p>
            </div>

            {!director && (
              <button
                onClick={handleOpenCreateDirector}
                className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء حساب مدير</span>
              </button>
            )}
          </div>

          {director ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-inner">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900">
                        {director.fullName || (director as any).full_name}
                      </h4>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        (director.is_active === 1 || director.isActive === true)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {(director.is_active === 1 || director.isActive === true) ? 'الحساب مفعّل' : 'الحساب معطل'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 block mt-0.5">
                      @{director.username} • الدور: مدير المديرية (DIRECTOR)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenEditDirector}
                    className="py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>تعديل بيانات المدير</span>
                  </button>

                  <button
                    onClick={handleToggleDirectorStatus}
                    className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                      (director.is_active === 1 || director.isActive === true)
                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>
                      {(director.is_active === 1 || director.isActive === true) ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[11px] text-slate-500 block">البريد الإلكتروني</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{director.email}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[11px] text-slate-500 block">رقم الهاتف</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{director.phone || 'غير مسجل'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[11px] text-slate-500 block">تاريخ الإنشاء</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{((director as any).created_at || '').split('T')[0] || 'غير محدد'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[11px] text-slate-500 block">آخر تسجيل دخول</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{(director as any).last_login ? ((director as any).last_login).split('T')[0] : 'لم يسجل دخول بعد'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>ملاحظة أمان:</strong> يضمن النظام وجود مدير واحد فعّال لكل مديرية. في حال الرغبة بتعيين مدير جديد، يمكنك تعديل هذا الحساب أو تعطيله أولاً.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">لا يوجد مدير معيّن لهذه المديرية حالياً</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                قم بإنشاء حساب المدير لتمكينه من إدارة مصالح المديرية وإصدار التوجيهات ومتابعة التقارير.
              </p>
              <button
                onClick={handleOpenCreateDirector}
                className="mt-2 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition inline-flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء حساب المدير الآن</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* REQUIREMENT 5: DEPARTMENT HEADS SECTION */}
      {/* ======================================================== */}
      {activeTab === 'heads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>رؤساء المصالح التابعين لـ {directorate.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ربط كل رئيس بمصلحة محددة داخل هذه المديرية فقط (محمي في Backend من التلاعب بالمعرفات).
              </p>
            </div>

            <button
              onClick={handleOpenCreateHead}
              disabled={departments.length === 0}
              className={`py-2 px-3.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-2 shadow-xs ${
                departments.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
              title={departments.length === 0 ? 'يرجى إنشاء مصالح أولاً' : 'إنشاء رئيس مصلحة'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء رئيس مصلحة</span>
            </button>
          </div>

          {departments.length === 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تنبيه: يجب إضافة مصلحة واحدة على الأقل في قسم "المصالح التابعة" قبل إنشاء حسابات رؤساء المصالح.</span>
            </div>
          )}

          {departmentHeads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">لا يوجد رؤساء مصالح مسجلين حالياً</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                بعد إنشاء المصالح، يمكنك تعيين رؤساء المصالح وربط كل واحد منهم بمصلحته الخاصة.
              </p>
              {departments.length > 0 && (
                <button
                  onClick={handleOpenCreateHead}
                  className="mt-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء أول رئيس مصلحة</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-3 px-4">رئيس المصلحة</th>
                      <th className="py-3 px-4">المصلحة المرتبطة</th>
                      <th className="py-3 px-4">البريد الإلكتروني</th>
                      <th className="py-3 px-4">رقم الهاتف</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departmentHeads.map((head: any) => {
                      const isActive = head.is_active === 1;
                      return (
                        <tr key={head.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{head.full_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">@{head.username}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              <span>{head.department_name || `مصلحة #${head.department_id}`}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-mono">{head.email}</td>
                          <td className="py-3 px-4 text-slate-700 font-mono">{head.phone || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}>
                              {isActive ? 'مفعل' : 'معطل'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditHead(head)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                title="تعديل بيانات الحساب"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleHeadStatus(head.id)}
                                className={`p-1.5 rounded-lg border transition ${
                                  isActive
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* REQUIREMENT 6: SUBSCRIPTION SECTION */}
      {/* ======================================================== */}
      {activeTab === 'subscription' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>اشتراك وترخيص {directorate.name}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                التحكم الكامل في فترة الاشتراك وحالته والتجديد السنوي.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenRenewSub}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تجديد الاشتراك (سنة كاملة)</span>
              </button>
              <button
                onClick={handleOpenEditSub}
                className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل بيانات الاشتراك</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 font-bold block mb-1">حالة الاشتراك الحالية:</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-extrabold px-3 py-1 rounded-lg border ${
                    subStatus === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : subStatus === 'SUSPENDED'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}>
                    {subStatus === 'ACTIVE' ? 'نشط وساري (ACTIVE)' : subStatus === 'SUSPENDED' ? 'معلق مؤقتاً (SUSPENDED)' : 'منتهي الصلاحية (EXPIRED)'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 font-bold block mb-1">الخطة المعتمدة:</span>
                <span className="text-sm font-mono font-extrabold text-indigo-700 block">
                  {subscription?.plan_name || directorate.subscription_plan || 'PRO_ENTERPRISE'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 font-bold block mb-1">تاريخ بداية الاشتراك:</span>
                <span className="text-sm font-mono font-bold text-slate-800 block">
                  {subStartDate}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 font-bold block mb-1">تاريخ نهاية الاشتراك:</span>
                <span className="text-sm font-mono font-bold text-slate-800 block">
                  {subEndDate}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 font-bold block mb-1">ملاحظات وسجل الاعتماد:</span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {subscription?.notes || 'لا توجد ملاحظات إضافية مسجلة للاشتراك.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT DEPARTMENT */}
      {/* ======================================================== */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{deptModalMode === 'CREATE' ? 'إضافة مصلحة جديدة' : 'تعديل بيانات المصلحة'}</span>
              </h3>
              <button
                onClick={() => setShowDeptModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDept} className="space-y-4">
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/60">
                المديرية المستهدفة: <strong className="text-slate-900">{directorate.name}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المصلحة الرسمي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مصلحة الإطعام"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرمز التعريفي للمصلحة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: catering أو medical"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">رمز فريد داخل هذه المديرية (أحرف إنجليزية وأرقام).</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف المصلحة واختصاصاتها</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر للمهام والمسؤوليات..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {deptModalMode === 'CREATE' ? 'إنشاء المصلحة' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT DIRECTOR */}
      {/* ======================================================== */}
      {showDirectorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>{directorModalMode === 'CREATE' ? 'إنشاء حساب مدير للمديرية' : 'تعديل حساب المدير'}</span>
              </h3>
              <button
                onClick={() => setShowDirectorModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDirector} className="space-y-4">
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/60">
                المديرية المستهدفة: <strong className="text-slate-900">{directorate.name}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: د. أحمد بن علي"
                  value={directorForm.full_name}
                  onChange={(e) => setDirectorForm({ ...directorForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {directorModalMode === 'CREATE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم للدخول *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: director_medea"
                    value={directorForm.username}
                    onChange={(e) => setDirectorForm({ ...directorForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  placeholder="director@dou-medea.dz"
                  value={directorForm.email}
                  onChange={(e) => setDirectorForm({ ...directorForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="0550123456"
                  value={directorForm.phone}
                  onChange={(e) => setDirectorForm({ ...directorForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {directorModalMode === 'CREATE' ? 'كلمة المرور *' : 'تحديث كلمة المرور (اتركها فارغة للإبقاء على الحالية)'}
                </label>
                <input
                  type="password"
                  required={directorModalMode === 'CREATE'}
                  minLength={6}
                  placeholder="••••••••"
                  value={directorForm.password}
                  onChange={(e) => setDirectorForm({ ...directorForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDirectorModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {directorModalMode === 'CREATE' ? 'إنشاء حساب المدير' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD / EDIT DEPARTMENT HEAD */}
      {/* ======================================================== */}
      {showHeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>{headModalMode === 'CREATE' ? 'إنشاء حساب رئيس مصلحة' : 'تعديل حساب رئيس مصلحة'}</span>
              </h3>
              <button
                onClick={() => setShowHeadModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitHead} className="space-y-4">
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/60">
                المديرية المستهدفة: <strong className="text-slate-900">{directorate.name}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المصلحة المرتبطة *</label>
                <select
                  required
                  value={headForm.department_id}
                  onChange={(e) => setHeadForm({ ...headForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- اختر مصلحة تابعة لهذه المديرية --</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  المصالح المعروضة تتبع حصرياً لـ {directorate.name}.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: د. كريم مسعودي"
                  value={headForm.full_name}
                  onChange={(e) => setHeadForm({ ...headForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {headModalMode === 'CREATE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم للدخول *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: head_catering_medea"
                    value={headForm.username}
                    onChange={(e) => setHeadForm({ ...headForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  required
                  placeholder="head@dou-medea.dz"
                  value={headForm.email}
                  onChange={(e) => setHeadForm({ ...headForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="0660123456"
                  value={headForm.phone}
                  onChange={(e) => setHeadForm({ ...headForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {headModalMode === 'CREATE' ? 'كلمة المرور *' : 'تحديث كلمة المرور (اتركها فارغة للإبقاء على الحالية)'}
                </label>
                <input
                  type="password"
                  required={headModalMode === 'CREATE'}
                  minLength={6}
                  placeholder="••••••••"
                  value={headForm.password}
                  onChange={(e) => setHeadForm({ ...headForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHeadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  {headModalMode === 'CREATE' ? 'إنشاء الحساب' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: EDIT SUBSCRIPTION */}
      {/* ======================================================== */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>تعديل اشتراك المديرية</span>
              </h3>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSub} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة الاشتراك *</label>
                <select
                  value={subForm.status}
                  onChange={(e) => setSubForm({ ...subForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="ACTIVE">نشط (ACTIVE)</option>
                  <option value="SUSPENDED">معلق (SUSPENDED)</option>
                  <option value="EXPIRED">منتهي الصلاحية (EXPIRED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الخطة</label>
                <select
                  value={subForm.plan_name}
                  onChange={(e) => setSubForm({ ...subForm, plan_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="PRO_ENTERPRISE">خطة المؤسسات المتقدمة (PRO_ENTERPRISE)</option>
                  <option value="STANDARD">خطة معيارية (STANDARD)</option>
                  <option value="BASIC">خطة أساسية (BASIC)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ البداية *</label>
                  <input
                    type="date"
                    required
                    value={subForm.start_date}
                    onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ النهاية *</label>
                  <input
                    type="date"
                    required
                    value={subForm.end_date}
                    onChange={(e) => setSubForm({ ...subForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الاعتماد</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات توثيقية حول تعديل الاشتراك..."
                  value={subForm.notes}
                  onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                >
                  حفظ وتحديث الاشتراك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: RENEW SUBSCRIPTION */}
      {/* ======================================================== */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span>تجديد اشتراك المديرية (تمديد سنوي)</span>
              </h3>
              <button
                onClick={() => setShowRenewModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRenew} className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 border border-emerald-200">
                سيتم تفعيل الاشتراك بحالة <strong>نشط (ACTIVE)</strong> وتمديد الصلاحية حتى التاريخ الموضح أدناه.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخطة المطلوبة</label>
                <select
                  value={renewForm.plan_name}
                  onChange={(e) => setRenewForm({ ...renewForm, plan_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="PRO_ENTERPRISE">خطة المؤسسات المتقدمة (PRO_ENTERPRISE)</option>
                  <option value="STANDARD">خطة معيارية (STANDARD)</option>
                  <option value="BASIC">خطة أساسية (BASIC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ نهاية الاشتراك الجديد *</label>
                <input
                  type="date"
                  required
                  value={renewForm.end_date}
                  onChange={(e) => setRenewForm({ ...renewForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظة التجديد</label>
                <textarea
                  rows={2}
                  value={renewForm.notes}
                  onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  تأكيد التجديد الفوري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
