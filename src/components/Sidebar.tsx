import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  FileText,
  Send,
  Award,
  BarChart3,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronLeft,
  Database,
  Lock,
  Stethoscope,
  Brain,
  Utensils,
  Wrench,
  ShieldCheck,
  AlertCircle,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [noticeModal, setNoticeModal] = useState<string | null>(null);

  const handleNav = (tabId: string) => {
    onSelectTab(tabId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleFutureFeature = (featureName: string) => {
    setNoticeModal(featureName);
  };

  const isDirector = user?.role === 'DIRECTOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const getDeptIcon = (code?: string) => {
    switch (code) {
      case 'medical': return <Stethoscope className="w-4 h-4 text-rose-500" />;
      case 'housing': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'psychology': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'catering': return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'security': return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      default: return <Building2 className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
        />
      )}

      {/* Future Stage Informational Alert Modal */}
      {noticeModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-amber-800 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-bold">قسم قيد التطوير — المراحل القادمة</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              قسم <strong className="text-slate-900">«{noticeModal}»</strong> مبرمج ومخطط له في المراحل اللاحقة، ولا يعمل حالياً في المرحلة الثانية حسب تعليمات الإدارة.
            </p>
            <button
              onClick={() => setNoticeModal(null)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-[85px] right-0 h-full md:h-[calc(100vh-85px)] w-72 bg-white border-l border-slate-200 z-40 flex flex-col justify-between shadow-lg md:shadow-none transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation Content */}
        <div className="overflow-y-auto py-4 px-3 flex-1 space-y-6">
          
          {/* SUPER_ADMIN SIDEBAR NAVIGATION */}
          {isSuperAdmin ? (
            <div className="space-y-4">
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center justify-between">
                  <span>منصة الإشراف العام SaaS</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">SUPER_ADMIN</span>
                </div>
                <nav className="space-y-1">
                  {/* 1. لوحة إدارة المنصة المركزية */}
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'dashboard'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-indigo-700' : 'text-slate-500'}`} />
                      <span>إدارة المنصة والمديريات</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* 2. المصالح التابعة للمديريات */}
                  <button
                    onClick={() => handleNav('departments')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'departments'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`w-4 h-4 ${currentTab === 'departments' ? 'text-indigo-700' : 'text-slate-500'}`} />
                      <span>المصالح التابعة للمديريات</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* 2.1 حسابات رؤساء المصالح */}
                  <button
                    onClick={() => handleNav('heads')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'heads'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck className={`w-4 h-4 ${currentTab === 'heads' ? 'text-indigo-700' : 'text-slate-500'}`} />
                      <span>حسابات رؤساء المصالح</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* 3. المستخدمون والصلاحيات */}
                  <button
                    onClick={() => handleNav('users')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'users'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className={`w-4 h-4 ${currentTab === 'users' ? 'text-indigo-700' : 'text-slate-500'}`} />
                      <span>حسابات المديرين ورؤساء المصالح</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* 4. التقارير الإدارية لكافة المديريات */}
                  <button
                    onClick={() => handleNav('reports')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'reports'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${currentTab === 'reports' ? 'text-indigo-700' : 'text-slate-500'}`} />
                      <span>تقارير كافة المديريات</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded">مركزي</span>
                  </button>

                  {/* 5. التوجيهات لكافة المديريات */}
                  <button
                    onClick={() => handleNav('directives')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'directives'
                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className={`w-4 h-4 ${currentTab === 'directives' ? 'text-indigo-700' : 'text-slate-500'}`} />
                      <span>توجيهات كافة المديريات</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded">مركزي</span>
                  </button>
                </nav>
              </div>

              {/* Super Admin Privileges Notice */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>صلاحيات المشرف العام:</span>
                </div>
                <p>إدارة المديريات والاشتراكات وإنشاء المصالح وتعيين المديرين ورؤساء المصالح.</p>
              </div>
            </div>
          ) : isDirector ? (
            <div className="space-y-4">
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  لوحة الإدارة المركزية (المدير)
                </div>
                <nav className="space-y-1">
                  {/* 1. لوحة التحكم */}
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'dashboard'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-emerald-700' : 'text-slate-500'}`} />
                      <span>لوحة التحكم</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* 2. توجيهات المدير (Phase 3 Active) */}
                  <button
                    onClick={() => handleNav('directives')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'directives'
                        ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className={`w-4 h-4 ${currentTab === 'directives' ? 'text-amber-700' : 'text-slate-500'}`} />
                      <span>توجيهات المدير</span>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">المرحلة 3</span>
                  </button>

                  {/* 3. التقارير الإدارية (Active in Phase 2) */}
                  <button
                    onClick={() => handleNav('reports')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'reports'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${currentTab === 'reports' ? 'text-emerald-700' : 'text-slate-500'}`} />
                      <span>التقارير الإدارية</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">المرحلة 2</span>
                  </button>

                  {/* 4. المصالح */}
                  <button
                    onClick={() => handleNav('departments')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'departments'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`w-4 h-4 ${currentTab === 'departments' ? 'text-emerald-700' : 'text-slate-500'}`} />
                      <span>المصالح (الستة)</span>
                    </div>
                    <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">6</span>
                  </button>

                  {/* 5. المستخدمون والصلاحيات */}
                  <button
                    onClick={() => handleNav('users')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'users'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className={`w-4 h-4 ${currentTab === 'users' ? 'text-emerald-700' : 'text-slate-500'}`} />
                      <span>المستخدمون والصلاحيات</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </nav>
              </div>

              {/* Director Future Sections (Phase 4+) */}
              <div className="border-t border-slate-200/80 pt-3">
                <div className="px-3 mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    أقسام المراحل القادمة
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                    مؤقت
                  </span>
                </div>
                <nav className="space-y-1">
                  {/* التقييمات */}
                  <button
                    onClick={() => handleFutureFeature('التقييمات الدورية')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-slate-400" />
                      <span>التقييمات</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-medium">مرحلة 4</span>
                  </button>

                  {/* الإحصائيات */}
                  <button
                    onClick={() => handleFutureFeature('الإحصائيات ولوحات الأداء المتقدمة')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <span>الإحصائيات</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-medium">مرحلة 4</span>
                  </button>

                  {/* الإعدادات */}
                  <button
                    onClick={() => handleFutureFeature('إعدادات النظام')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>الإعدادات</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-medium">مرحلة 4</span>
                  </button>
                </nav>
              </div>
            </div>
          ) : (
            /* DEPARTMENT HEAD SIDEBAR NAVIGATION */
            <div className="space-y-4">
              <div>
                <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  لوحة رئيس المصلحة
                </div>
                <nav className="space-y-1">
                  {/* 1. لوحة التحكم */}
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'dashboard'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-blue-700' : 'text-slate-500'}`} />
                      <span>لوحة التحكم</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* 2. توجيهاتي (Active in Phase 3) */}
                  <button
                    onClick={() => handleNav('directives')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'directives'
                        ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className={`w-4 h-4 ${currentTab === 'directives' ? 'text-amber-700' : 'text-slate-500'}`} />
                      <span>توجيهاتي</span>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">المرحلة 3</span>
                  </button>

                  {/* 3. تقاريري (Active in Phase 2) */}
                  <button
                    onClick={() => handleNav('reports')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'reports'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${currentTab === 'reports' ? 'text-emerald-700' : 'text-slate-500'}`} />
                      <span>تقاريري ({user?.departmentName})</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">المرحلة 2</span>
                  </button>

                  {/* 4. مصلحتي */}
                  <button
                    onClick={() => handleNav('departments')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'departments'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {getDeptIcon(user?.departmentCode)}
                      <span>مصلحتي</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* 5. حسابي */}
                  <button
                    onClick={() => handleNav('users')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      currentTab === 'users'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserIcon className={`w-4 h-4 ${currentTab === 'users' ? 'text-blue-700' : 'text-slate-500'}`} />
                      <span>حسابي</span>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </nav>
              </div>

              {/* Department Head Isolation Notice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>عزل الصلاحيات:</span>
                </div>
                <p>صلاحياتك محصورة قانونياً في <strong className="text-slate-900">{user?.departmentName}</strong> فقط.</p>
              </div>
            </div>
          )}

          {/* Common Action: تسجيل الخروج */}
          <div className="border-t border-slate-200 pt-3">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer / System Badge */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>منصة متعددة المديريات (Multi-Tenant)</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>حالة المنظومة:</span>
              <span className="font-mono text-emerald-600 font-semibold">المرحلة 3.5 نشطة</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>نطاق الصلاحيات:</span>
              <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                {isSuperAdmin ? 'كافة المديريات' : isDirector ? 'مديريتك فقط' : 'مصلحتك فقط'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
