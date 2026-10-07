import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Power, 
  Calendar, 
  RefreshCw,
  Building,
  KeyRound,
  FileText,
  Activity,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  UserCheck,
  Mail,
  Phone
} from 'lucide-react';
import { Directorate, Subscription, Department, User, UserRole } from '../types/index.ts';
import { DirectorateManagementView } from './DirectorateManagementView.tsx';

interface SuperAdminDashboardProps {
  initialTab?: 'directorates' | 'departments' | 'heads' | 'users' | 'subscriptions' | 'logs';
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ initialTab = 'directorates' }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'directorates' | 'departments' | 'heads' | 'users' | 'subscriptions' | 'logs'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Dedicated Directorate Management View (Requirement 1 & 2)
  const [managingDirectorateId, setManagingDirectorateId] = useState<number | null>(null);

  // Data states
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [selectedDirId, setSelectedDirId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showDirModal, setShowDirModal] = useState(false);
  const [dirModalMode, setDirModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingDir, setEditingDir] = useState<Directorate | null>(null);
  const [dirForm, setDirForm] = useState({
    name: '',
    code: '',
    description: '',
    plan_name: 'PRO_ENTERPRISE',
    subscription_end_date: ''
  });

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    directorate_id: 1,
    code: '',
    name: '',
    description: '',
    icon: 'Building2'
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'DIRECTOR' as UserRole,
    directorate_id: 1,
    department_id: null as number | null
  });

  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [subForm, setSubForm] = useState({
    directorate_id: 1,
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'SUSPENDED',
    plan_name: 'PRO_ENTERPRISE',
    start_date: '',
    end_date: '',
    notes: ''
  });

  // Dedicated Department Heads Section State & Modals
  const [headSearchQuery, setHeadSearchQuery] = useState('');
  const [headFilterDirId, setHeadFilterDirId] = useState<string>('ALL');
  const [headFilterDeptId, setHeadFilterDeptId] = useState<string>('ALL');
  const [headFilterStatus, setHeadFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [showHeadModal, setShowHeadModal] = useState(false);
  const [headModalMode, setHeadModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingHead, setEditingHead] = useState<any | null>(null);
  const [headForm, setHeadForm] = useState({
    full_name: '',
    username: '',
    email: '',
    directorate_id: 1,
    department_id: '' as string | number,
    password: '',
    confirm_password: '',
    is_active: 1
  });
  const [headFormError, setHeadFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [dirRes, deptRes, userRes, subRes, logRes] = await Promise.all([
        fetch('/api/admin/directorates', { headers }),
        fetch('/api/departments', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/admin/subscriptions', { headers }),
        fetch('/api/admin/activity-logs?limit=40', { headers })
      ]);

      const [dirData, deptData, userData, subData, logData] = await Promise.all([
        dirRes.json(),
        deptRes.json(),
        userRes.json(),
        subRes.json(),
        logRes.json()
      ]);

      if (dirData.success) setDirectorates(dirData.data);
      if (deptData.success) setDepartments(deptData.data);
      if (userData.success) setUsersList(userData.data);
      if (subData.success) setSubscriptions(subData.data);
      if (logData.success) setLogs(logData.data);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setActionError('فشل تحميل بيانات المنصة');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

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

  // Directorate Handlers
  const handleOpenCreateDir = () => {
    setDirModalMode('CREATE');
    setEditingDir(null);
    const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDirForm({
      name: '',
      code: '',
      description: '',
      plan_name: 'PRO_ENTERPRISE',
      subscription_end_date: oneYear
    });
    setShowDirModal(true);
  };

  const handleOpenEditDir = (dir: Directorate) => {
    setDirModalMode('EDIT');
    setEditingDir(dir);
    setDirForm({
      name: dir.name,
      code: dir.code,
      description: dir.description || '',
      plan_name: 'PRO_ENTERPRISE',
      subscription_end_date: ''
    });
    setShowDirModal(true);
  };

  const handleSubmitDir = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const url = dirModalMode === 'CREATE' ? '/api/admin/directorates' : `/api/admin/directorates/${editingDir?.id}`;
      const method = dirModalMode === 'CREATE' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(dirForm)
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشلت العملية');
        return;
      }
      setActionSuccess(data.message);
      setShowDirModal(false);
      fetchData();
    } catch (err: any) {
      setActionError('حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleToggleDirStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/directorates/${id}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تغيير حالة المديرية');
        return;
      }
      setActionSuccess(data.message);
      fetchData();
    } catch (err) {
      setActionError('فشل تغيير حالة المديرية');
    }
  };

  // Department Handlers
  const handleOpenCreateDept = () => {
    setDeptModalMode('CREATE');
    setEditingDept(null);
    setDeptForm({
      directorate_id: directorates[0]?.id || 1,
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
      directorate_id: dept.directorate_id || 1,
      code: dept.code,
      name: dept.name,
      description: dept.description,
      icon: dept.icon || 'Building2'
    });
    setShowDeptModal(true);
  };

  const handleSubmitDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const url = deptModalMode === 'CREATE' ? '/api/admin/departments' : `/api/admin/departments/${editingDept?.id}`;
      const method = deptModalMode === 'CREATE' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(deptForm)
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشلت العملية');
        return;
      }
      setActionSuccess(data.message);
      setShowDeptModal(false);
      fetchData();
    } catch (err) {
      setActionError('حدث خطأ أثناء حفظ المصلحة');
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه المصلحة؟')) return;
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل حذف المصلحة');
        return;
      }
      setActionSuccess(data.message);
      fetchData();
    } catch (err) {
      setActionError('فشل حذف المصلحة');
    }
  };

  // User Handlers
  const handleOpenCreateUser = () => {
    setUserModalMode('CREATE');
    setEditingUser(null);
    const defaultDirId = directorates[0]?.id || 1;
    const deptsInDir = departments.filter(d => d.directorate_id === defaultDirId);
    setUserForm({
      full_name: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      role: 'DIRECTOR',
      directorate_id: defaultDirId,
      department_id: deptsInDir[0]?.id || null
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: any) => {
    setUserModalMode('EDIT');
    setEditingUser(u);
    setUserForm({
      full_name: u.full_name || u.fullName,
      username: u.username,
      email: u.email,
      password: '',
      phone: u.phone || '',
      role: u.role,
      directorate_id: u.directorate_id || u.directorateId || 1,
      department_id: u.department_id || u.departmentId || null
    });
    setShowUserModal(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const url = userModalMode === 'CREATE' ? '/api/admin/users' : `/api/admin/users/${editingUser?.id}`;
      const method = userModalMode === 'CREATE' ? 'POST' : 'PUT';

      const payload: any = { ...userForm };
      if (payload.role === 'DIRECTOR') {
        payload.department_id = null;
      }

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
        setActionError(data.error || 'فشلت العملية');
        return;
      }
      setActionSuccess(data.message);
      setShowUserModal(false);
      fetchData();
    } catch (err) {
      setActionError('حدث خطأ أثناء حفظ المستخدم');
    }
  };

  const handleToggleUserStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تغيير حالة المستخدم');
        return;
      }
      setActionSuccess(data.message);
      fetchData();
    } catch (err) {
      setActionError('فشل تغيير حالة المستخدم');
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف حساب "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل حذف الحساب');
        return;
      }
      setActionSuccess(data.message || 'تم حذف حساب المستخدم بنجاح');
      fetchData();
    } catch {
      setActionError('فشل حذف الحساب');
    }
  };

  // Dedicated Department Head Handlers
  const handleOpenCreateHead = (preselectedDirId?: number) => {
    setHeadModalMode('CREATE');
    setEditingHead(null);
    setHeadFormError(null);
    const targetDirId = preselectedDirId || (directorates[0]?.id || 1);
    const deptsInDir = departments.filter(d => d.directorate_id === targetDirId);
    setHeadForm({
      full_name: '',
      username: '',
      email: '',
      directorate_id: targetDirId,
      department_id: deptsInDir[0]?.id || '',
      password: '',
      confirm_password: '',
      is_active: 1
    });
    setShowHeadModal(true);
  };

  const handleOpenEditHead = (head: any) => {
    setHeadModalMode('EDIT');
    setEditingHead(head);
    setHeadFormError(null);
    const headDirId = head.directorate_id || head.directorateId || 1;
    const headDeptId = head.department_id || head.departmentId || '';
    setHeadForm({
      full_name: head.full_name || head.fullName || '',
      username: head.username || '',
      email: head.email || '',
      directorate_id: headDirId,
      department_id: headDeptId,
      password: '',
      confirm_password: '',
      is_active: (head.is_active === 1 || head.isActive === true) ? 1 : 0
    });
    setShowHeadModal(true);
  };

  const handleSubmitHead = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeadFormError(null);

    // Strict Validations
    if (!headForm.full_name.trim()) {
      setHeadFormError('يرجى إدخال الاسم الكامل لرئيس المصلحة');
      return;
    }
    if (!headForm.username.trim()) {
      setHeadFormError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!headForm.directorate_id) {
      setHeadFormError('يرجى اختيار المديرية التابع لها');
      return;
    }
    if (!headForm.department_id) {
      setHeadFormError('يرجى اختيار المصلحة المعين عليها رئيس المصلحة');
      return;
    }

    if (headModalMode === 'CREATE') {
      if (!headForm.password) {
        setHeadFormError('يرجى إدخال كلمة المرور');
        return;
      }
      if (headForm.password.length < 6) {
        setHeadFormError('كلمة المرور يجب ألا تقل عن 6 أحرف');
        return;
      }
      if (headForm.password !== headForm.confirm_password) {
        setHeadFormError('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
        return;
      }
    } else {
      if (headForm.password) {
        if (headForm.password.length < 6) {
          setHeadFormError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
          return;
        }
        if (headForm.password !== headForm.confirm_password) {
          setHeadFormError('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
          return;
        }
      }
    }

    try {
      const url = headModalMode === 'CREATE' ? '/api/admin/users' : `/api/admin/users/${editingHead?.id}`;
      const method = headModalMode === 'CREATE' ? 'POST' : 'PUT';

      const payload: any = {
        full_name: headForm.full_name.trim(),
        username: headForm.username.trim(),
        email: headForm.email.trim() || undefined,
        role: 'DEPARTMENT_HEAD',
        directorate_id: headForm.directorate_id,
        department_id: parseInt(headForm.department_id.toString(), 10),
        is_active: headForm.is_active
      };

      if (headForm.password) {
        payload.password = headForm.password.trim();
        payload.confirm_password = headForm.confirm_password.trim();
      }

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
        setHeadFormError(data.error || 'فشلت العملية');
        return;
      }

      setActionSuccess(data.message || (headModalMode === 'CREATE' ? 'تم إنشاء حساب رئيس المصلحة بنجاح' : 'تم تحديث حساب رئيس المصلحة بنجاح'));
      setShowHeadModal(false);
      fetchData();
    } catch {
      setHeadFormError('حدث خطأ أثناء حفظ بيانات رئيس المصلحة');
    }
  };

  // Subscription Handlers
  const handleOpenRenewSub = (sub: Subscription) => {
    setEditingSub(sub);
    const today = new Date().toISOString().split('T')[0];
    const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setSubForm({
      directorate_id: sub.directorate_id,
      status: 'ACTIVE',
      plan_name: sub.plan_name || 'PRO_ENTERPRISE',
      start_date: today,
      end_date: oneYear,
      notes: `تجديد سنوي معتمد من المشرف العام بتاريخ ${today}`
    });
    setShowSubModal(true);
  };

  const handleSubmitSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(subForm)
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.error || 'فشل تسجيل الاشتراك');
        return;
      }
      setActionSuccess(data.message);
      setShowSubModal(false);
      fetchData();
    } catch (err) {
      setActionError('حدث خطأ أثناء حفظ الاشتراك');
    }
  };

  // Filtered lists
  const filteredDepartments = departments.filter(d => {
    if (selectedDirId !== 'ALL' && d.directorate_id !== parseInt(selectedDirId, 10)) return false;
    if (searchQuery && !d.name.includes(searchQuery) && !d.code.includes(searchQuery)) return false;
    return true;
  });

  const filteredUsers = usersList.filter((u: any) => {
    if (u.role === 'SUPER_ADMIN') return false;
    const uDirId = u.directorate_id || u.directorateId;
    if (selectedDirId !== 'ALL' && uDirId !== parseInt(selectedDirId, 10)) return false;
    const fullName = u.full_name || u.fullName || '';
    if (searchQuery && !fullName.includes(searchQuery) && !u.username.includes(searchQuery) && !u.email.includes(searchQuery)) return false;
    return true;
  });

  const filteredDirectorates = directorates.filter(d => {
    if (searchQuery && !d.name.includes(searchQuery) && !d.code.includes(searchQuery)) return false;
    return true;
  });

  const departmentHeadsList = usersList.filter(u => u.role === 'DEPARTMENT_HEAD');

  const filteredDepartmentHeads = departmentHeadsList.filter((head: any) => {
    const headDirId = head.directorate_id || head.directorateId;
    if (headFilterDirId !== 'ALL' && headDirId !== parseInt(headFilterDirId, 10)) {
      return false;
    }
    const headDeptId = head.department_id || head.departmentId;
    if (headFilterDeptId !== 'ALL' && headDeptId !== parseInt(headFilterDeptId, 10)) {
      return false;
    }
    const isActive = head.is_active === 1 || head.isActive === true;
    if (headFilterStatus === 'ACTIVE' && !isActive) return false;
    if (headFilterStatus === 'INACTIVE' && isActive) return false;

    if (headSearchQuery.trim()) {
      const q = headSearchQuery.toLowerCase();
      const nameMatch = (head.full_name || head.fullName || '').toLowerCase().includes(q);
      const userMatch = (head.username || '').toLowerCase().includes(q);
      const emailMatch = (head.email || '').toLowerCase().includes(q);
      const dirMatch = (head.directorate_name || '').toLowerCase().includes(q);
      const deptMatch = (head.dept_name || head.department_name || '').toLowerCase().includes(q);
      return nameMatch || userMatch || emailMatch || dirMatch || deptMatch;
    }

    return true;
  });

  // KPIs
  const totalDirectoratesCount = directorates.length;
  const activeDirectoratesCount = directorates.filter(d => d.is_active === 1).length;
  const totalDepartmentsCount = departments.length;
  const totalDirectorsCount = usersList.filter(u => u.role === 'DIRECTOR').length;
  const totalHeadsCount = usersList.filter(u => u.role === 'DEPARTMENT_HEAD').length;
  const activeSubsCount = subscriptions.filter(s => s.status === 'ACTIVE').length;

  // Dedicated Directorate Management View (Requirement 1, 2, 3, 4, 5, 6)
  if (managingDirectorateId !== null) {
    return (
      <DirectorateManagementView
        directorateId={managingDirectorateId}
        onBack={() => {
          setManagingDirectorateId(null);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-500/30 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>المرحلة 3.5: منظومة SaaS متعددة المديريات (Multi-Tenant SaaS Architecture)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              مركز القيادة والتحكم العام للمنصة (Super Admin)
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              إدارة تأسيس المديريات الجامعية، ضبط الهيكلة الإدارية والمصالح، تخصيص حسابات المديرين ورؤساء المصالح، وتسيير التراخيص والاشتراكات.
            </p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-2 text-xs font-medium"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
            <button
              onClick={handleOpenCreateDir}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مديرية جديدة</span>
            </button>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 font-medium">المديريات الجامعية</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{totalDirectoratesCount}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-1">{activeDirectoratesCount} نشطة</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 font-medium">المصالح الإدارية</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{totalDepartmentsCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">عبر كافة المديريات</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 font-medium">المديرون المعينون</div>
            <div className="text-xl font-extrabold text-amber-300 mt-0.5">{totalDirectorsCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">مدير لكل مديرية</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 font-medium">رؤساء المصالح</div>
            <div className="text-xl font-extrabold text-blue-300 mt-0.5">{totalHeadsCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">عزل إداري تام</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 font-medium">الاشتراكات السارية</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{activeSubsCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">تراخيص SaaS فعالة</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[11px] text-slate-400 font-medium">حالة العزل الأمني</div>
            <div className="text-sm font-extrabold text-emerald-300 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>محمي 100%</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Database & JWT RBAC</div>
          </div>
        </div>
      </div>

      {/* Action Messages */}
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

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('directorates')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'directorates'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>المديريات الجامعية ({directorates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>المصالح التابعة ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('heads')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'heads'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>حسابات رؤساء المصالح ({departmentHeadsList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>كافة المستخدمين ({usersList.filter(u => u.role !== 'SUPER_ADMIN').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'subscriptions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>الاشتراكات والتراخيص ({subscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سجل الرقابة العامة ({logs.length})</span>
          </button>
        </div>

        {/* Global Search & Directorate Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab !== 'directorates' && activeTab !== 'logs' && activeTab !== 'heads' && (
            <select
              value={selectedDirId}
              onChange={(e) => setSelectedDirId(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">جميع المديريات</option>
              {directorates.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          )}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث سريع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: DIRECTORATES */}
      {activeTab === 'directorates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>دليل المديريات الجامعية المسجلة في المنصة</span>
            </h3>
            <button
              onClick={handleOpenCreateDir}
              className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مديرية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDirectorates.map(dir => {
              const isSubActive = dir.subscription_status === 'ACTIVE';
              return (
                <div 
                  key={dir.id}
                  className={`bg-white rounded-2xl p-5 border transition shadow-xs hover:shadow-md flex flex-col justify-between ${
                    dir.is_active === 1 ? 'border-slate-200/80' : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          dir.is_active === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'
                        }`}>
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{dir.name}</h4>
                          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {dir.code}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dir.is_active === 1 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {dir.is_active === 1 ? 'مفعلة' : 'معطلة'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {dir.description || 'لا يوجد وصف تفصيلي مسجل.'}
                    </p>

                    {/* Requirement 10: Statistics Box */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs mb-4">
                      <div>
                        <span className="text-[11px] text-slate-500 block">المصالح:</span>
                        <span className="font-extrabold text-slate-900">{dir.departments_count || 0} مصالح</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">المستخدمون:</span>
                        <span className="font-extrabold text-slate-900">{dir.users_count || 0} مستخدمين</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500 block">المدير:</span>
                        <span className="font-extrabold text-slate-900 truncate block">
                          {dir.director_name || 'غير معيّن'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500 block">الاشتراك:</span>
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded inline-block ${
                          isSubActive 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : dir.subscription_status === 'SUSPENDED' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {dir.subscription_status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    {/* Requirement 1: Prominent Directorate Management Button */}
                    <button
                      onClick={() => setManagingDirectorateId(dir.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs group cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-indigo-200" />
                      <span>إدارة المديرية</span>
                      <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditDir(dir)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => handleToggleDirStatus(dir.id)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          dir.is_active === 1
                            ? 'border border-red-200 text-red-700 hover:bg-red-50'
                            : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={dir.is_active === 1 ? 'تعطيل المديرية' : 'تفعيل المديرية'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{dir.is_active === 1 ? 'تعطيل' : 'تفعيل'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>إدارة المصالح والهيكلة الإدارية للمديريات</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد المصالح لكل مديرية وتعيين صلاحياتها (حصرياً من صلاحيات المشرف العام).
              </p>
            </div>
            <button
              onClick={handleOpenCreateDept}
              className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مصلحة</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">المصلحة</th>
                    <th className="py-3 px-4">الرمز</th>
                    <th className="py-3 px-4">المديرية التابعة لها</th>
                    <th className="py-3 px-4">رئيس المصلحة الحالي</th>
                    <th className="py-3 px-4">الوصف</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((dept, idx) => (
                    <tr key={dept.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>{dept.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {dept.code}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-indigo-50 text-indigo-800 font-semibold px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                          {dept.directorate_name || `مديرية #${dept.directorate_id}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {dept.head_name ? (
                          <div>
                            <span className="font-bold text-slate-800 block">{dept.head_name}</span>
                            <span className="text-[10px] text-slate-400">{dept.head_email}</span>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                            غير معين حالياً
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {dept.description}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditDept(dept)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
                            title="تعديل المصلحة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="حذف المصلحة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DEPARTMENT HEADS (حسابات رؤساء المصالح) */}
      {activeTab === 'heads' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>حسابات رؤساء المصالح</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إنشاء وإدارة حسابات رؤساء المصالح، وربط كل حساب حصرياً بمصلحته المحددة ومديريته المعتمدة.
              </p>
            </div>
            <button
              onClick={() => handleOpenCreateHead()}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء حساب رئيس مصلحة</span>
            </button>
          </div>

          {/* Quick Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 block">إجمالي رؤساء المصالح</span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">{departmentHeadsList.length}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 block">الحسابات النشطة</span>
              <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                {departmentHeadsList.filter(h => h.is_active === 1 || (h as any).isActive === true).length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 block">الحسابات المعطلة</span>
              <span className="text-lg font-black text-red-500 mt-0.5 block">
                {departmentHeadsList.filter(h => h.is_active === 0 || (h as any).isActive === false).length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 block">المديريات الممثلة</span>
              <span className="text-lg font-black text-indigo-600 mt-0.5 block">
                {new Set(departmentHeadsList.map((h: any) => h.directorate_id || h.directorateId)).size} مديريات
              </span>
            </div>
          </div>

          {/* Multi-Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Directorate Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">المديرية الجامعية</label>
                <select
                  value={headFilterDirId}
                  onChange={(e) => {
                    setHeadFilterDirId(e.target.value);
                    setHeadFilterDeptId('ALL');
                  }}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">جميع المديريات ({directorates.length})</option>
                  {directorates.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">المصلحة</label>
                <select
                  value={headFilterDeptId}
                  onChange={(e) => setHeadFilterDeptId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">جميع المصالح</option>
                  {departments
                    .filter(d => headFilterDirId === 'ALL' || d.directorate_id === parseInt(headFilterDirId, 10))
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الحالة</label>
                <select
                  value={headFilterStatus}
                  onChange={(e) => setHeadFilterStatus(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">كافة الحالات</option>
                  <option value="ACTIVE">النشطة فقط</option>
                  <option value="INACTIVE">المعطلة فقط</option>
                </select>
              </div>

              {/* Search Query */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">بحث سريع</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="الاسم، اسم المستخدم، البريد..."
                    value={headSearchQuery}
                    onChange={(e) => setHeadSearchQuery(e.target.value)}
                    className="w-full pr-8 pl-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredDepartmentHeads.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">لا توجد حسابات لرؤساء المصالح مطابقة</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {departmentHeadsList.length === 0
                    ? 'لم يتم إنشاء أي حساب لرئيس مصلحة بعد. يمكنك البدء بإنشاء أول حساب وربطه بمصلحته المحددة.'
                    : 'لا توجد نتائج مطابقة لخيارات الفلترة الحالية. يرجى تعديل البحث أو إعادة تعيين الفلاتر.'
                  }
                </p>
                {departmentHeadsList.length === 0 ? (
                  <button
                    onClick={() => handleOpenCreateHead()}
                    className="mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition inline-flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إنشاء أول حساب رئيس مصلحة</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setHeadFilterDirId('ALL');
                      setHeadFilterDeptId('ALL');
                      setHeadFilterStatus('ALL');
                      setHeadSearchQuery('');
                    }}
                    className="mt-2 py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">رئيس المصلحة</th>
                      <th className="py-3 px-4">اسم المستخدم</th>
                      <th className="py-3 px-4">البريد الإلكتروني</th>
                      <th className="py-3 px-4">المديرية التابع لها</th>
                      <th className="py-3 px-4">المصلحة المعين عليها</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDepartmentHeads.map((head: any, idx) => {
                      const isActive = head.is_active === 1 || head.isActive === true;
                      return (
                        <tr key={head.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs border border-indigo-200">
                                {(head.full_name || head.fullName || 'ر').charAt(0)}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 block">{head.full_name || head.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: #{head.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            @{head.username}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {head.email || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-indigo-50 text-indigo-800 font-semibold px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                              {head.directorate_name || `مديرية #${head.directorate_id || head.directorateId}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-emerald-600" />
                              <span>{head.dept_name || head.department_name || `مصلحة #${head.department_id || head.departmentId}`}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              isActive 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              <span>{isActive ? 'نشط' : 'معطل'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditHead(head)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
                                title="تعديل بيانات رئيس المصلحة"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(head.id)}
                                className={`p-1.5 rounded-lg transition ${
                                  isActive ? 'text-slate-400 hover:text-red-600' : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(head.id, head.full_name || head.fullName || head.username)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                title="حذف الحساب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* TAB 3: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>إدارة المستخدمين والصلاحيات (DIRECTOR & DEPARTMENT_HEAD)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توزيع وربط كل مدير بمديريته، وكل رئيس مصلحة بمصلحته المحددة داخل مديريته.
              </p>
            </div>
            <button
              onClick={handleOpenCreateUser}
              className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء حساب جديد</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">الاسم الكامل</th>
                    <th className="py-3 px-4">اسم المستخدم</th>
                    <th className="py-3 px-4">الدور الوظيفي</th>
                    <th className="py-3 px-4">المديرية</th>
                    <th className="py-3 px-4">المصلحة المعين عليها</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u: any, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block">{u.full_name || u.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{u.username}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'DIRECTOR'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {u.role === 'DIRECTOR' ? 'مدير الإقامة' : 'رئيس مصلحة'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {u.directorate_name || `مديرية #${u.directorate_id || u.directorateId}`}
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'DIRECTOR' ? (
                          <span className="text-slate-400 italic">الإدارة العامة كاملة</span>
                        ) : (
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {u.dept_name || u.departmentName || `مصلحة #${u.department_id || u.departmentId}`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.is_active === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {u.is_active === 1 ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
                            title="تعديل المستخدم"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`p-1.5 rounded-lg transition ${
                              u.is_active === 1 ? 'text-slate-400 hover:text-red-600' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>إدارة اشتراكات وتراخيص المديريات (SaaS Subscriptions)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة الخطط السنوية، تواريخ الصلاحية، وتجديد أو تجميد التراخيص.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">المديرية الجامعية</th>
                    <th className="py-3 px-4">الرمز</th>
                    <th className="py-3 px-4">الخطة المسجلة</th>
                    <th className="py-3 px-4">حالة الاشتراك</th>
                    <th className="py-3 px-4">تاريخ البداية</th>
                    <th className="py-3 px-4">تاريخ الانتهاء</th>
                    <th className="py-3 px-4">ملاحظات الترخيص</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub, idx) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{sub.directorate_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{sub.directorate_code}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded text-[11px] border border-indigo-200">
                          {sub.plan_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sub.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : sub.status === 'SUSPENDED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sub.status === 'ACTIVE' ? 'نشط وساري' : sub.status === 'SUSPENDED' ? 'معلق / مجمد' : 'منتهي الصلاحية'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{sub.start_date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{sub.end_date}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{sub.notes || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenRenewSub(sub)}
                          className="py-1 px-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] transition"
                        >
                          تجديد / تمديد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>سجل الرقابة والعمليات المركزية للمنصة (Activity Logs)</span>
          </h3>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {logs.map(log => (
                <div key={log.id} className="p-3.5 hover:bg-slate-50/80 transition flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{log.action}</span>
                        {log.directorate_name && (
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.2 rounded font-semibold">
                            {log.directorate_name}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">بواسطة: {log.user_full_name || 'النظام'}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{log.details}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[11px] text-slate-400 block">{new Date(log.created_at).toLocaleString('ar-DZ')}</span>
                    <span className="font-mono text-[10px] text-slate-400 block">{log.ip_address || '127.0.0.1'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE/EDIT DIRECTORATE */}
      {showDirModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <span>{dirModalMode === 'CREATE' ? 'إنشاء مديرية جامعية جديدة' : 'تعديل بيانات المديرية'}</span>
            </h3>

            <form onSubmit={handleSubmitDir} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المديرية أو الإقامة الجامعية *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الإقامة الجامعية قسنطينة 2"
                  value={dirForm.name}
                  onChange={(e) => setDirForm({ ...dirForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرمز التعريفي الفريد (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: DIR-CONST-02"
                  value={dirForm.code}
                  onChange={(e) => setDirForm({ ...dirForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الوصف العام والموقع</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر للمديرية الجامعية وطاقتها الاستيعابية..."
                  value={dirForm.description}
                  onChange={(e) => setDirForm({ ...dirForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {dirModalMode === 'CREATE' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">خطة الاشتراك</label>
                    <select
                      value={dirForm.plan_name}
                      onChange={(e) => setDirForm({ ...dirForm, plan_name: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="STANDARD">STANDARD</option>
                      <option value="PRO_ENTERPRISE">PRO_ENTERPRISE</option>
                      <option value="PREMIUM">PREMIUM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ انتهاء الترخيص</label>
                    <input
                      type="date"
                      value={dirForm.subscription_end_date}
                      onChange={(e) => setDirForm({ ...dirForm, subscription_end_date: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
                >
                  {dirModalMode === 'CREATE' ? 'حفظ وتفعيل المديرية' : 'تحديث البيانات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDirModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE/EDIT DEPARTMENT */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>{deptModalMode === 'CREATE' ? 'إضافة مصلحة تابعة لمديرية' : 'تعديل بيانات المصلحة'}</span>
            </h3>

            <form onSubmit={handleSubmitDept} className="space-y-3.5">
              {deptModalMode === 'CREATE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المديرية الجامعية التابعة لها *</label>
                  <select
                    value={deptForm.directorate_id}
                    onChange={(e) => setDeptForm({ ...deptForm, directorate_id: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {directorates.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المصلحة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مصلحة النشاطات الثقافية والرياضية"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرمز الفريد للمصلحة (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: activities"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toLowerCase() })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500 lowercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف واختصاصات المصلحة</label>
                <textarea
                  rows={2}
                  placeholder="تحديد مهام المصلحة والصلاحيات المنوطة برئيسها..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
                >
                  {deptModalMode === 'CREATE' ? 'إنشاء المصلحة' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE/EDIT USER */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>{userModalMode === 'CREATE' ? 'إنشاء حساب مستخدم جديد' : 'تعديل بيانات المستخدم'}</span>
            </h3>

            <form onSubmit={handleSubmitUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الدور الإداري *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setUserForm({ ...userForm, role: r });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="DIRECTOR">مدير الإقامة الجامعية (DIRECTOR)</option>
                  <option value="DEPARTMENT_HEAD">رئيس مصلحة (DEPARTMENT_HEAD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المديرية الجامعية التابع لها *</label>
                <select
                  value={userForm.directorate_id}
                  onChange={(e) => {
                    const dirId = parseInt(e.target.value, 10);
                    const deptsInDir = departments.filter(d => d.directorate_id === dirId);
                    setUserForm({
                      ...userForm,
                      directorate_id: dirId,
                      department_id: deptsInDir[0]?.id || null
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  {directorates.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {userForm.role === 'DEPARTMENT_HEAD' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المصلحة المعين عليها *</label>
                  <select
                    value={userForm.department_id || ''}
                    onChange={(e) => setUserForm({ ...userForm, department_id: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  >
                    <option value="">-- اختر المصلحة --</option>
                    {departments
                      .filter(d => d.directorate_id === userForm.directorate_id)
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: د. سامي عبد الرحمن"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم *</label>
                  <input
                    type="text"
                    required
                    disabled={userModalMode === 'EDIT'}
                    placeholder="مثال: director_setif"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="مثال: director@setif.dz"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {userModalMode === 'CREATE' ? 'كلمة المرور *' : 'تغيير كلمة المرور (اختياري)'}
                  </label>
                  <input
                    type="password"
                    required={userModalMode === 'CREATE'}
                    placeholder={userModalMode === 'CREATE' ? '••••••••' : 'اتركه فارغاً للإبقاء'}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="مثال: 0550 11 22 33"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
                >
                  {userModalMode === 'CREATE' ? 'إنشاء وتفعيل الحساب' : 'حفظ التعديلات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENEW SUBSCRIPTION */}
      {showSubModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>تجديد وتمديد ترخيص المديرية</span>
            </h3>

            <form onSubmit={handleSubmitSub} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المديرية الجامعية</label>
                <input
                  type="text"
                  disabled
                  value={editingSub?.directorate_name || ''}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة الاشتراك *</label>
                  <select
                    value={subForm.status}
                    onChange={(e) => setSubForm({ ...subForm, status: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="ACTIVE">نشط (ACTIVE)</option>
                    <option value="SUSPENDED">معلق (SUSPENDED)</option>
                    <option value="EXPIRED">منتهي (EXPIRED)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">خطة الاشتراك</label>
                  <select
                    value={subForm.plan_name}
                    onChange={(e) => setSubForm({ ...subForm, plan_name: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STANDARD">STANDARD</option>
                    <option value="PRO_ENTERPRISE">PRO_ENTERPRISE</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    required
                    value={subForm.start_date}
                    onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    required
                    value={subForm.end_date}
                    onChange={(e) => setSubForm({ ...subForm, end_date: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التجديد</label>
                <textarea
                  rows={2}
                  value={subForm.notes}
                  onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
                >
                  حفظ وتأكيد التجديد
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
