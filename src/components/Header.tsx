import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Building, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  Calendar, 
  ChevronDown,
  RefreshCw,
  Clock
} from 'lucide-react';
import { DemoAccount } from '../types/index.ts';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout, login } = useAuth();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    // Format Arabic date
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDateStr(now.toLocaleDateString('ar-DZ', options));

    // Fetch demo accounts for quick testing
    fetch('/api/system/demo-accounts')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDemoAccounts(data.accounts);
        }
      })
      .catch(err => console.error('Failed to load demo accounts', err));
  }, []);

  const handleQuickSwitch = async (account: DemoAccount) => {
    setShowSwitchMenu(false);
    await login(account.identifier, account.password || 'password');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top Ministerial Bar */}
      <div className="bg-slate-950 py-1 px-4 text-xs text-slate-400 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>الجمهورية الجزائرية الديمقراطية الشعبية</span>
          <span className="text-slate-600">|</span>
          <span className="hidden sm:inline">وزارة التعليم العالي والبحث العلمي</span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">الديوان الوطني للخدمات الجامعية</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentDateStr}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
            المرحلة الأولى: التأسيس والصلاحيات
          </span>
        </div>
      </div>

      {/* Main App Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left / Title area */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none"
            title="تبديل القائمة"
            aria-label="القائمة الرئيسية"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-400/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                منصة المتابعة الإدارية للإقامة الجامعية
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                منظومة الربط والتنسيق الإداري بين الإدارة ورؤساء المصالح
              </p>
            </div>
          </div>
        </div>

        {/* Right / User & Actions */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Quick Switch Dropdown for testing Phase 1 */}
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="hidden lg:flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                title="التبديل السريع بين الحسابات للاختبار"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>تبديل الحساب (تجريبي)</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showSwitchMenu && (
                <div 
                  className="absolute left-0 mt-2 w-72 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  dir="rtl"
                >
                  <div className="px-3 py-1.5 border-b border-slate-800 text-xs font-semibold text-slate-400">
                    تبديل سريع لحساب آخر (لاختبار الصلاحيات):
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.identifier}
                        onClick={() => handleQuickSwitch(acc)}
                        className={`w-full text-right px-3 py-2 text-xs hover:bg-slate-800 flex items-center justify-between transition ${
                          user.username === acc.identifier ? 'bg-emerald-950/50 text-emerald-300 font-medium' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{acc.name}</span>
                          <span className="text-[11px] text-slate-400">{acc.department}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          acc.role === 'SUPER_ADMIN'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : acc.role === 'DIRECTOR' 
                            ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}>
                          {acc.roleLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Current user badge */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                user.role === 'SUPER_ADMIN'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : user.role === 'DIRECTOR'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {user.role === 'SUPER_ADMIN' ? 'س' : user.role === 'DIRECTOR' ? 'م' : 'ر'}
              </div>
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-100">{user.fullName}</span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  {user.role === 'SUPER_ADMIN'
                    ? 'المشرف العام للمنصة SaaS'
                    : user.role === 'DIRECTOR'
                    ? `مدير الإقامة (${user.directorateName || 'المديرية المركزية'})`
                    : `${user.departmentName} (${user.directorateName || 'المديرية المركزية'})`}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition flex items-center gap-1.5 text-xs"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline font-medium">خروج</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
