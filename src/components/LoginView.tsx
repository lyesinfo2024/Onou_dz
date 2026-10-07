import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Building, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ChevronDown,
  Info,
  ShieldCheck
} from 'lucide-react';
import { Directorate } from '../types/index.ts';

export const LoginView: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  
  // Form states
  const [selectedDirectorateId, setSelectedDirectorateId] = useState<string>('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Dynamic directorates loaded from /api/public/directorates
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [isLoadingDirectorates, setIsLoadingDirectorates] = useState(true);

  // 1. Fetch active directorates dynamically from the database
  const fetchDirectorates = async () => {
    setIsLoadingDirectorates(true);
    try {
      const res = await fetch('/api/public/directorates');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDirectorates(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch public directorates:', err);
    } finally {
      setIsLoadingDirectorates(false);
    }
  };

  useEffect(() => {
    fetchDirectorates();
  }, []);

  // Handle directorate selection change
  const handleDirectorateChange = (dirIdValue: string) => {
    setSelectedDirectorateId(dirIdValue);
    setLocalError(null);
    setPassword(''); // Requirement 4: password stays empty and secure

    if (!dirIdValue) {
      setIdentifier('');
      return;
    }

    if (dirIdValue === 'SUPER_ADMIN') {
      // Central platform administration
      setIdentifier('superadmin');
      return;
    }

    const numId = parseInt(dirIdValue, 10);
    const selectedDir = directorates.find(d => d.id === numId);

    if (selectedDir) {
      // Auto-populate director's username or email from database
      const directorLogin = selectedDir.director_username || selectedDir.director_email || '';
      setIdentifier(directorLogin);
    } else {
      setIdentifier('');
    }
  };

  // Check if currently selected directorate has a designated director
  const currentSelectedDir = selectedDirectorateId && selectedDirectorateId !== 'SUPER_ADMIN'
    ? directorates.find(d => d.id === parseInt(selectedDirectorateId, 10))
    : null;

  const hasNoDirector = currentSelectedDir && !currentSelectedDir.director_username && !currentSelectedDir.director_email && !currentSelectedDir.director_name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!identifier.trim() || !password) {
      setLocalError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Pass the real directorateId (number or 'SUPER_ADMIN') to login
    const targetDirId = selectedDirectorateId === 'SUPER_ADMIN' || selectedDirectorateId === '' 
      ? selectedDirectorateId 
      : parseInt(selectedDirectorateId, 10);

    const res = await login(identifier.trim(), password, targetDirId);
    if (!res.success) {
      setLocalError(res.error || 'فشل تسجيل الدخول');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between" dir="rtl">
      {/* Official Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 py-2.5 px-4 text-center text-xs sm:text-sm font-medium">
        <span>الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التعليم العالي والبحث العلمي</span>
      </div>

      {/* Main Centered Login Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          
          {/* Header */}
          <div className="text-center mb-6 space-y-1.5">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-900/20 mb-2 border border-indigo-400/30">
              <Building className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              منصة المتابعة الإدارية
            </h1>
            <p className="text-base font-bold text-indigo-700">
              للخدمات الجامعية
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8 space-y-5">
            
            {(localError || error) && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{localError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. Directorate Select Dropdown (Single Dropdown) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المديرية
                </label>
                <div className="relative">
                  <select
                    value={selectedDirectorateId}
                    onChange={(e) => handleDirectorateChange(e.target.value)}
                    disabled={isLoadingDirectorates}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition appearance-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="">[ اختر المديرية ▼ ]</option>
                    <option value="SUPER_ADMIN">إدارة المنصة المركزية (Super Admin)</option>
                    {directorates.map((dir) => (
                      <option key={dir.id} value={dir.id}>
                        {dir.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Notice if the selected directorate has no assigned director */}
                {hasNoDirector && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-medium">
                    <Info className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>لا يوجد مدير معين لهذه المديرية حالياً.</span>
                  </div>
                )}

                {/* Director details note if available */}
                {currentSelectedDir && currentSelectedDir.director_name && (
                  <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="font-semibold text-slate-700">المدير المسؤول:</span>
                    <span>{currentSelectedDir.director_name}</span>
                  </div>
                )}
              </div>

              {/* 2. Email / Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني أو اسم المستخدم
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="أدخل البريد أو اسم المستخدم"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-slate-800"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* 3. Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-slate-800"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 4. Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-900/10 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>تسجيل الدخول</span>
                )}
              </button>
            </form>

          </div>

          {/* Privacy & Security Note */}
          <div className="mt-4 text-center text-xs text-slate-500 space-y-1">
            <p>نظام موحد متعدد المديريات (Multi-Tenant Architecture)</p>
            <p className="text-[11px] text-slate-400">عزل تام وتأمين البيانات لكل مديرية جامعية ومصالحها</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-3 text-center text-xs text-slate-400">
        منصة المتابعة الإدارية للخدمات الجامعية — نظام متعدد المديريات Multi-Tenant SaaS
      </footer>
    </div>
  );
};
