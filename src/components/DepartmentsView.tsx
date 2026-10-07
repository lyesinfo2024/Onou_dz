import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Building2, 
  Stethoscope, 
  Brain, 
  Utensils, 
  Wrench, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Shield, 
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Layers,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { Department } from '../types/index.ts';

interface DepartmentsViewProps {
  onBack: () => void;
  selectedDept?: Department | null;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({ onBack, selectedDept }) => {
  const { user, token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDept, setActiveDept] = useState<Department | null>(selectedDept || null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDirector = user?.role === 'DIRECTOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const hasFullAccess = isDirector || isSuperAdmin;

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setDepartments(data.data);
          if (data.data.length > 0) {
            if (selectedDept) {
              const found = data.data.find((d: Department) => d.id === selectedDept.id);
              setActiveDept(found || data.data[0]);
            } else {
              setActiveDept(data.data[0]);
            }
          }
        } else {
          setErrorMessage(data.error || 'فشل استرجاع بيانات المصالح');
        }
      } catch (err) {
        console.error('Failed to load departments', err);
        setErrorMessage('تعذر الاتصال بالخادم');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, [token, selectedDept]);

  const getDeptIcon = (code?: string) => {
    switch (code) {
      case 'medical': return <Stethoscope className="w-5 h-5 text-rose-600" />;
      case 'housing': return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'psychology': return <Brain className="w-5 h-5 text-purple-600" />;
      case 'catering': return <Utensils className="w-5 h-5 text-amber-600" />;
      case 'maintenance': return <Wrench className="w-5 h-5 text-orange-600" />;
      case 'security': return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      default: return <Building2 className="w-5 h-5 text-slate-600" />;
    }
  };

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
              {isSuperAdmin ? 'إشراف مركزي لكافة مديريات المنصة (SaaS)' : isDirector ? 'إشراف مركزي كامل (المدير)' : 'نطاق المصلحة الخاصة فقط'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {isSuperAdmin
              ? 'دليل المصالح التابعة لكافة المديريات (SUPER_ADMIN)'
              : isDirector 
              ? 'دليل المصالح الإدارية الستة (المدير)' 
              : `بيانات مصلحتي: ${user?.departmentName}`
            }
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'قائمة المصالح التابعة للمديريات المسجلة في المنصة وإمكانية إدارتها مركزياً'
              : isDirector
              ? 'المصالح الستة المسجلة رسمياً مع رؤساء المصالح المعينين'
              : 'البيانات والمهام الرسمية للمصلحة المكلف برئاستها فقط دون غيرها'
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

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* If Department Head: SINGLE DEDICATED VIEW (No other 5 departments exist) */}
      {!hasFullAccess ? (
        <div className="space-y-6">
          {activeDept ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                    {getDeptIcon(activeDept.code)}
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                      كود المصلحة: {activeDept.code}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {activeDept.name}
                    </h3>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>مصلحتك المكلف بها</span>
                </span>
              </div>

              {/* Department Description / Mandate */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span>المهام الإدارية والميدانية لمصلحتك:</span>
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {activeDept.description}
                </div>
              </div>

              {/* Head of Department details */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60">
                <h4 className="text-xs font-bold text-slate-700 mb-3">
                  بياناتك كرئيس لهذه المصلحة:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الاسم الكامل:</span>
                    <span className="font-bold text-slate-800 text-sm">{activeDept.head_name || user?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الصفة الإدارية:</span>
                    <span className="font-bold text-emerald-700">رئيس مصلحة</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">البريد الإلكتروني المهني:</span>
                    <span className="font-mono text-slate-800">{activeDept.head_email || user?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">رقم الهاتف:</span>
                    <span className="font-mono text-slate-800">{activeDept.head_phone || user?.phone || 'غير مسجل'}</span>
                  </div>
                </div>
              </div>

              {/* RBAC Isolation Security Reminder */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">مبدأ العزل الإداري المحمي عبر Backend:</span>
                  بموجب نظام الصلاحيات، لا تظهر لك ولا يمكنك طلب بيانات المصالح الخمس الأخرى. أي طلب مباشر عبر البرمجة أو الروابط إلى مصلحة غير مصلحتك يتم رفضه فوراً من الخادم برمز منع 403 Forbidden.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              جاري تحميل بيانات مصلحتك...
            </div>
          )}
        </div>
      ) : (
        /* DIRECTOR VIEW: FULL 6 DEPARTMENTS SELECTOR AND DETAIL */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (List of all 6 depts) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase px-1">
              المصالح الستة المعتمدة (المدير)
            </h3>
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                جاري التحميل...
              </div>
            ) : (
              departments.map((dept) => {
                const isSelected = activeDept?.id === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setActiveDept(dept)}
                    className={`w-full text-right p-4 rounded-xl border transition flex items-center justify-between group ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg border ${
                        isSelected ? 'bg-white border-emerald-200' : 'bg-slate-50 border-slate-100'
                      }`}>
                        {getDeptIcon(dept.code)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {dept.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          رئيس المصلحة: <span className="font-semibold text-slate-700">{dept.head_name}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      #{dept.id}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column (Active Dept Detail Card for Director) */}
          <div className="lg:col-span-2">
            {activeDept ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      {getDeptIcon(activeDept.code)}
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                        كود المصلحة: {activeDept.code}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 mt-1">
                        {activeDept.name}
                      </h3>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مصلحة معتمدة</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>المهام الإدارية والميدانية الموكلة:</span>
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {activeDept.description}
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/60">
                  <h4 className="text-xs font-bold text-slate-700 mb-3">
                    بيانات رئيس المصلحة المكلف:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">الاسم واللقب:</span>
                      <span className="font-bold text-slate-800 text-sm">{activeDept.head_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">الصفة الإدارية:</span>
                      <span className="font-bold text-emerald-700">رئيس مصلحة</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">البريد الإلكتروني:</span>
                      <span className="font-mono text-slate-800">{activeDept.head_email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">رقم الهاتف:</span>
                      <span className="font-mono text-slate-800">{activeDept.head_phone}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold block">إشراف المدير العام:</span>
                    بصفتك مديراً للإقامة الجامعية، لديك الصلاحية الكاملة للاطلاع على المصالح الستة وتوجيه التعليمات ومتابعة تقارير كل مصلحة في المرحلة الثانية.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium">اختر إحدى المصالح من القائمة لعرض تفاصيلها</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
