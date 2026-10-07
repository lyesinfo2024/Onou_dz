import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Directive, DirectivePriority, DirectiveTargetType, Department } from '../types/index.ts';
import { 
  X, 
  Send, 
  FileEdit, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  Users2,
  AlertTriangle,
  Clock,
  Flame,
  HelpCircle,
  Loader2
} from 'lucide-react';

interface DirectiveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialDirective?: Directive | null; // For editing
}

export const DirectiveFormModal: React.FC<DirectiveFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDirective
}) => {
  const { token } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<DirectiveTargetType>('DEPARTMENT');
  const [targetDeptId, setTargetDeptId] = useState<number | ''>(1);
  const [priority, setPriority] = useState<DirectivePriority>('NORMAL');
  const [dueDate, setDueDate] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load departments list for target dropdown
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/departments', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setDepartments(data.data);
        }
      })
      .catch(err => console.error('Failed to load departments:', err));

    if (initialDirective) {
      setTitle(initialDirective.title);
      setContent(initialDirective.content);
      setTargetType(initialDirective.target_type);
      setTargetDeptId(initialDirective.target_department_id || 1);
      setPriority(initialDirective.priority);
      setDueDate(initialDirective.due_date || '');
    } else {
      // Defaults for new directive
      setTitle('');
      setContent('');
      setTargetType('DEPARTMENT');
      setTargetDeptId(1);
      setPriority('NORMAL');
      const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setDueDate(inTwoWeeks);
    }
    setErrorMsg(null);
  }, [isOpen, initialDirective, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg('يرجى إدخال عنوان واضح ومناسب للتوجيه الإداري (3 أحرف على الأقل)');
      return;
    }

    if (!content.trim() || content.trim().length < 5) {
      setErrorMsg('يرجى كتابة نص وتفاصيل التوجيه الإداري المطلوب');
      return;
    }

    if (targetType === 'DEPARTMENT' && !targetDeptId) {
      setErrorMsg('يرجى تحديد المصلحة المستهدفة بالتوجيه');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        target_type: targetType,
        target_department_id: targetType === 'DEPARTMENT' ? Number(targetDeptId) : null,
        priority,
        due_date: dueDate || null
      };

      let res;
      if (initialDirective) {
        // Edit existing directive
        res = await fetch(`/api/directives/${initialDirective.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new directive
        res = await fetch('/api/directives', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل حفظ التوجيه الإداري');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess(initialDirective ? 'تم تحديث التوجيه الإداري بنجاح' : 'تم إصدار التوجيه الإداري بنجاح');
      onClose();
    } catch (err) {
      console.error('Save directive error:', err);
      setErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialDirective ? 'تعديل التوجيه الإداري' : 'إصدار توجيه إداري جديد'}
              </h3>
              <p className="text-xs text-slate-500">
                إصدار تعليمات وتوجيهات رسمية ملزمة للمصالح التابعة للإقامة الجامعية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Target Selector */}
          <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-3.5 space-y-2.5">
            <label className="block font-bold text-slate-800">
              الجهة المستهدفة بالتوجيه <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('DEPARTMENT')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  targetType === 'DEPARTMENT'
                    ? 'bg-amber-50 text-amber-900 border-amber-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>مصلحة محددة</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('ALL')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  targetType === 'ALL'
                    ? 'bg-purple-50 text-purple-900 border-purple-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Users2 className="w-4 h-4 text-purple-700" />
                <span>جميع المصالح (عام)</span>
              </button>
            </div>

            {targetType === 'DEPARTMENT' && (
              <div className="pt-1">
                <label className="block font-medium text-slate-600 mb-1 text-[11px]">
                  اختر المصلحة المعنية:
                </label>
                <select
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 text-slate-800 font-bold"
                  required
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                درجة الأولوية والأهمية <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPriority('NORMAL')}
                  className={`py-1.5 px-2 rounded-lg border font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                    priority === 'NORMAL'
                      ? 'bg-slate-200 text-slate-900 border-slate-400'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>عادي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('HIGH')}
                  className={`py-1.5 px-2 rounded-lg border font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                    priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-900 border-amber-400'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                  <span>هام</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('URGENT')}
                  className={`py-1.5 px-2 rounded-lg border font-bold text-[11px] flex items-center justify-center gap-1 transition ${
                    priority === 'URGENT'
                      ? 'bg-rose-100 text-rose-900 border-rose-400'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Flame className="w-3 h-3 text-rose-600" />
                  <span>عاجل</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                تاريخ الاستحقاق / الأجل المحدد
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
            </div>
          </div>

          {/* 3. Directive Title */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              موضوع / عنوان التوجيه <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تعليمات بخصوص تشديد إجراءات مراقبة الدخول خلال الفترة المسائية"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 transition"
              required
            />
          </div>

          {/* 4. Directive Content */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              نص وتفاصيل التوجيه الإداري <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب التوجيه والتعليمات المطلوبة بوضوح، مع تحديد الإجراءات والخطوات الواجب اتخاذها من قبل المسؤول المعني..."
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 transition font-sans"
              required
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-amber-900/10"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{initialDirective ? 'تحديث التوجيه' : 'إصدار التوجيه الآن'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
