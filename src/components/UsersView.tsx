import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Users, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Phone, 
  Clock, 
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Database,
  Building2,
  User as UserIcon
} from 'lucide-react';
import { User } from '../types/index.ts';

interface UsersViewProps {
  onBack: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ onBack }) => {
  const { user, token } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isDirector = user?.role === 'DIRECTOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasFullAccess = isDirector || isSuperAdmin;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setUsersList(data.data);
        }
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

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
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {isSuperAdmin ? 'إدارة المستخدمين المركزية لكافة المديريات (SaaS)' : isDirector ? 'إدارة مستخدمي المديرية المركزية' : 'بيانات الحساب الشخصي'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {hasFullAccess 
              ? 'سجل المستخدمين وتوزيع الصلاحيات الإدارية' 
              : 'ملف حسابي والصلاحيات الممنوحة'
            }
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'عرض وإدارة كافة حسابات المديرين ورؤساء المصالح عبر جميع المديريات'
              : isDirector 
              ? 'عرض كافة حسابات الإدارة ورؤساء المصالح المعتمدة في هذه المديرية'
              : `بيانات اعتمادك الخاصة برئاسة ${user?.departmentName}`
            }
          </p>
        </div>

        <button
          onClick={onBack}
          className="self-start sm:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <span>العودة للوحة القيادة</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Security Note Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>تشفير كلمات المرور وحماية الهوية</span>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                Bcrypt + Salt
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {hasFullAccess
                ? 'كلمات المرور لا تخزن كنص واضح على الإطلاق داخل قاعدة بيانات SQLite، بل يتم تشفيرها وفق أحدث المعايير الأمنية.'
                : 'حسابك مؤمن بكلمة مرور مشفرة. لا يستطيع أي مستخدم آخر غير المدير الاطلاع على حسابك.'
              }
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700 shrink-0">
          {hasFullAccess ? (
            <>إجمالي الحسابات المسجلة: <span className="font-bold text-emerald-400">{usersList.length}</span></>
          ) : (
            <span className="text-blue-300 font-semibold">حساب رئيس مصلحة معتمد</span>
          )}
        </div>
      </div>

      {/* IF DEPARTMENT HEAD: SHOW PERSONAL ACCOUNT PROFILE (NO OTHER HEADS DISPLAYED) */}
      {!hasFullAccess ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg border border-blue-200">
              {user?.fullName?.charAt(0) || 'ر'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{user?.fullName}</h3>
              <p className="text-xs text-emerald-700 font-bold">{user?.roleName} — {user?.departmentName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">اسم المستخدم (Username):</span>
              <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{user?.username}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">البريد الإلكتروني المهني:</span>
              <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{user?.email}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">المصلحة التابعة:</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{user?.departmentName}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 block text-[11px]">رقم الهاتف المسجل:</span>
              <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{user?.phone || 'غير مسجل'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">الصلاحيات المعتمدة لحسابك:</span>
            <ul className="space-y-1 text-slate-600 text-[11px]">
              <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إدارة ومتابعة شؤون {user?.departmentName} فقط</span>
              </li>
              <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إعداد تقارير {user?.departmentName} وإرسالها للمدير (المرحلة 2)</span>
              </li>
              <li className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>استقبال توجيهات المدير الخاصة بمصلحتك (المرحلة 2)</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <span>⛔ عزل تام عن بيانات وقوائم رؤساء المصالح الأخرى</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        /* DIRECTOR: FULL TABLE OF ALL USERS */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>قائمة كافة المستخدمين في قاعدة البيانات</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              حسابات معتمدة ومفعلة
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              جاري استرجاع الحسابات...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">الاسم واللقب</th>
                    <th className="py-3 px-4">اسم المستخدم</th>
                    <th className="py-3 px-4">البريد الإلكتروني</th>
                    <th className="py-3 px-4">الصفة / الدور</th>
                    <th className="py-3 px-4">المصلحة المرتبطة</th>
                    <th className="py-3 px-4">الهاتف</th>
                    <th className="py-3 px-4">آخر دخول</th>
                    <th className="py-3 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {usersList.map((u, idx) => {
                    const isCurrent = user?.id === u.id;
                    const isUserDirector = u.role === 'DIRECTOR';
                    return (
                      <tr key={u.id} className={`transition ${isCurrent ? 'bg-emerald-50/40 font-bold' : 'hover:bg-slate-50/80'}`}>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              isUserDirector 
                                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}>
                              {isUserDirector ? 'م' : 'ر'}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{u.full_name}</span>
                              {isCurrent && (
                                <span className="text-[10px] text-emerald-700 font-semibold">(حسابك الحالي)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {u.username}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isUserDirector
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {isUserDirector ? 'مدير الإقامة' : 'رئيس مصلحة'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.dept_name ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <span>{u.dept_name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">الإدارة العامة</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {u.phone || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {u.last_login ? new Date(u.last_login).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) : 'لم يسجل بعد'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>نشط</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Permissions Breakdown Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>مقارنة الصلاحيات الإدارية المطبقة (مستوى الخادم Backend)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">الصلاحية الإدارية</th>
                <th className="py-2.5 px-4 text-center">مدير الإقامة (Director)</th>
                <th className="py-2.5 px-4 text-center">رئيس المصلحة (Dept Head)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-4 font-medium">الاطلاع على جميع المصالح الستة وبياناتها</td>
                <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">متاح بالكامل (المصالح الستة)</td>
                <td className="py-2.5 px-4 text-center text-red-600 font-semibold">محظور (مصلحته فقط ومحمي في Backend)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium">الاطلاع على قائمة رؤساء المصالح وبياناتهم</td>
                <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">متاح للجميع</td>
                <td className="py-2.5 px-4 text-center text-red-600 font-semibold">محظور (يرى حسابه فقط)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium">إعداد ورفع التقارير الدورية (المرحلة 2)</td>
                <td className="py-2.5 px-4 text-center text-slate-400">استلام ومراجعة لكافة المصالح</td>
                <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">إعداد ورفع لمصلحته فقط</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium">إصدار التوجيهات والتعليمات الملزمة (المرحلة 2)</td>
                <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">صلاحية حصرية للمدير</td>
                <td className="py-2.5 px-4 text-center text-slate-400">استقبال وتنفيذ لمصلحته فقط</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
