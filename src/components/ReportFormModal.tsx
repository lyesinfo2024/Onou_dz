import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Report, ReportType, ReportAttachment } from '../types/index.ts';
import { 
  X, 
  Send, 
  FileEdit, 
  Calendar, 
  CalendarDays, 
  CalendarRange, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  FileText,
  Paperclip,
  Trash2,
  UploadCloud,
  FileUp,
  Image,
  Loader2,
  Info
} from 'lucide-react';

interface ReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialReport?: Report | null; // For editing
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
}

function getFileTypeInfo(filename: string) {
  const ext = getFileExtension(filename);
  switch (ext) {
    case '.pdf':
      return { label: 'PDF', bg: 'bg-red-50 text-red-700 border-red-200', iconColor: 'text-red-600' };
    case '.doc':
    case '.docx':
      return { label: 'Word', bg: 'bg-blue-50 text-blue-700 border-blue-200', iconColor: 'text-blue-600' };
    case '.xls':
    case '.xlsx':
      return { label: 'Excel', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconColor: 'text-emerald-600' };
    case '.ppt':
    case '.pptx':
      return { label: 'PowerPoint', bg: 'bg-orange-50 text-orange-700 border-orange-200', iconColor: 'text-orange-600' };
    case '.jpg':
    case '.jpeg':
    case '.png':
      return { label: 'صورة', bg: 'bg-purple-50 text-purple-700 border-purple-200', iconColor: 'text-purple-600' };
    default:
      return { label: 'ملف', bg: 'bg-slate-50 text-slate-700 border-slate-200', iconColor: 'text-slate-600' };
  }
}

export const ReportFormModal: React.FC<ReportFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialReport
}) => {
  const { user, token } = useAuth();

  const [reportType, setReportType] = useState<ReportType>('DAILY');
  const [title, setTitle] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [content, setContent] = useState('');

  // Attachments state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ReportAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load report data and existing attachments when opened
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setStatusMessage(null);
    setSelectedFiles([]);
    setShowConfirmSubmit(false);

    if (initialReport) {
      setReportType(initialReport.report_type);
      setTitle(initialReport.title);
      setReportDate(initialReport.report_date || '');
      setPeriodStart(initialReport.period_start || '');
      setPeriodEnd(initialReport.period_end || '');
      setContent(initialReport.content);

      // Fetch existing attachments if report already exists
      fetchExistingAttachments(initialReport.id);
    } else {
      setExistingAttachments([]);
      const today = new Date().toISOString().split('T')[0];
      setReportType('DAILY');
      setTitle(`تقرير يومي - ${user?.departmentName || ''} (${today})`);
      setReportDate(today);
      setPeriodStart(today);
      setPeriodEnd(today);
      setContent(
`1. الوضعية العامة للمصلحة:
- سير العمل عادي ومنتظم في جميع الأقسام.

2. الأعمال والنشاطات المنجزة:
- 

3. النقائص والاحتياجات المسجلة:
- لا توجد نقائص طارئة.

4. الملاحظات والتوصيات:
- `
      );
    }
  }, [initialReport, isOpen, user]);

  const fetchExistingAttachments = async (reportId: number) => {
    setIsLoadingAttachments(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/attachments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setExistingAttachments(data.data);
      }
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  if (!isOpen) return null;

  const handleTypeChange = (type: ReportType) => {
    setReportType(type);
    const today = new Date().toISOString().split('T')[0];
    if (type === 'DAILY') {
      setTitle(`تقرير يومي - ${user?.departmentName || ''} (${today})`);
    } else if (type === 'WEEKLY') {
      setTitle(`تقرير أسبوعي - ${user?.departmentName || ''} (أسبوع ${today})`);
    } else if (type === 'MONTHLY') {
      const yearMonth = today.substring(0, 7);
      setTitle(`تقرير شهري - ${user?.departmentName || ''} (شهر ${yearMonth})`);
    }
  };

  const handleInsertSection = (textToAppend: string) => {
    setContent(prev => `${prev}\n\n${textToAppend}`);
  };

  // Handle files selection with strict client validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = getFileExtension(file.name);

      // Check file size (max 10MB)
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`الملف "${file.name}" حجمه (${formatFileSize(file.size)}) أكبر من الحد الأقصى المسموح به (10 ميغابايت)`);
        continue;
      }

      // Check allowed extension
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`نوع الملف "${file.name}" غير مسموح به. الأنواع المسموحة: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG`);
        continue;
      }

      // Prevent duplicate file selection
      const isDuplicate = selectedFiles.some(f => f.name === file.name && f.size === file.size) ||
                          existingAttachments.some(a => a.original_filename === file.name && a.file_size === file.size);
      if (isDuplicate) {
        errors.push(`الملف "${file.name}" تم اختياره مسبقاً`);
        continue;
      }

      newFiles.push(file);
    }

    if (errors.length > 0) {
      setErrorMsg(errors.join(' | '));
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }

    // Reset input so the user can add more files of the same name if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveSelectedFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Delete existing attachment from server
  const handleDeleteExistingAttachment = async (attachmentId: number, filename: string) => {
    if (!initialReport) return;
    if (!window.confirm(`هل أنت متأكد من حذف المرفق "${filename}" نهائياً من التقرير؟`)) {
      return;
    }

    setDeletingAttachmentId(attachmentId);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/reports/${initialReport.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل حذف المرفق');
        return;
      }

      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
    } catch (err) {
      console.error('Delete attachment error:', err);
      setErrorMsg('تعذر الاتصال بالخادم لحذف المرفق');
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  // Save report (Draft or Submit) + Upload any selected attachments
  const handleSave = async (submitNow: boolean) => {
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('يرجى إدخال عنوان مناسب للتقرير');
      return;
    }

    if (!content.trim() || content.trim().length < 5) {
      setErrorMsg('يرجى كتابة محتوى التقرير الإداري');
      return;
    }

    if (reportType === 'DAILY' && !reportDate) {
      setErrorMsg('تاريخ التقرير اليومي مطلوب');
      return;
    }

    if (reportType === 'WEEKLY' && (!periodStart || !periodEnd)) {
      setErrorMsg('تاريخ بداية ونهاية الأسبوع مطلوبان');
      return;
    }

    if (reportType === 'MONTHLY' && !periodStart && !reportDate) {
      setErrorMsg('تحديد الشهر والسنة مطلوب للتقرير الشهري');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('جاري حفظ بيانات التقرير...');

    try {
      let targetReportId: number;

      if (initialReport) {
        // 1. Update existing report
        targetReportId = initialReport.id;
        const res = await fetch(`/api/reports/${targetReportId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            report_type: reportType,
            title: title.trim(),
            report_date: reportDate,
            period_start: periodStart,
            period_end: periodEnd,
            content: content.trim()
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.error || 'حدث خطأ أثناء تحديث التقرير');
          setIsSubmitting(false);
          setStatusMessage(null);
          return;
        }
      } else {
        // 1. Create new report as DRAFT first so we get the targetReportId
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            report_type: reportType,
            title: title.trim(),
            report_date: reportDate,
            period_start: periodStart,
            period_end: periodEnd,
            content: content.trim(),
            status: 'DRAFT' // Create as draft first to safely upload attachments
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.error || 'حدث خطأ أثناء إنشاء التقرير');
          setIsSubmitting(false);
          setStatusMessage(null);
          return;
        }
        targetReportId = data.reportId;
      }

      // 2. Upload any staged attachments if selected
      if (selectedFiles.length > 0) {
        setStatusMessage(`جاري رفع ${selectedFiles.length} مرفق(ات) بأمان...`);
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });

        const uploadRes = await fetch(`/api/reports/${targetReportId}/attachments`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          setErrorMsg(uploadData.error || 'تم حفظ التقرير ولكن فشل رفع المرفقات، يمكنك إضافتها لاحقاً');
          setIsSubmitting(false);
          setStatusMessage(null);
          return;
        }
      }

      // 3. If final submission requested, submit to the Director
      if (submitNow) {
        setStatusMessage('جاري إرسال التقرير النهائي إلى المدير...');
        const submitRes = await fetch(`/api/reports/${targetReportId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        const submitData = await submitRes.json();
        if (!submitRes.ok || !submitData.success) {
          setErrorMsg(submitData.error || 'تم حفظ التقرير ولكن فشل إرساله، يمكنك إرساله من شاشة التقارير');
          setIsSubmitting(false);
          setStatusMessage(null);
          return;
        }
      }

      setIsSubmitting(false);
      setStatusMessage(null);
      const totalAttached = existingAttachments.length + selectedFiles.length;
      const successMsg = submitNow 
        ? (totalAttached > 0 ? `تم إرسال التقرير مع (${totalAttached}) مرفق(ات) إلى المدير بنجاح` : 'تم إرسال التقرير إلى المدير بنجاح')
        : (totalAttached > 0 ? `تم حفظ مسودة التقرير مع (${totalAttached}) مرفق(ات) بنجاح` : 'تم حفظ مسودة التقرير بنجاح');
      onSuccess(successMsg);
      onClose();
    } catch (err: any) {
      console.error('Save report error:', err);
      setErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  const totalAttachmentsCount = existingAttachments.length + selectedFiles.length;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialReport ? 'تعديل التقرير الإداري والمرفقات' : 'إعداد تقرير إداري جديد مع المرفقات'}
              </h3>
              <p className="text-xs text-slate-500">
                المصلحة المصدرة: <strong className="text-slate-800">{user?.departmentName}</strong> (يتم الربط آلياً)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Revision notice if report was sent back for revision */}
          {initialReport?.status === 'NEEDS_REVISION' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>ملاحظات وتوجيهات المدير لإعادة التعديل:</span>
              </div>
              <p className="text-xs text-rose-800 bg-white/80 p-2.5 rounded-lg border border-rose-200 leading-relaxed font-medium">
                {initialReport.revision_notes || 'يرجى مراجعة وتدقيق معطيات هذا التقرير وإعادة إرساله.'}
              </p>
              <p className="text-[11px] text-rose-700 font-semibold pt-1">
                * يمكنك تعديل نص التقرير وإضافة أو حذف أي مرفقات ثم إعادة إرسال التقرير للمدير.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span className="font-semibold">{statusMessage}</span>
            </div>
          )}

          {/* 1. Report Type Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              نوع التقرير الإداري <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('DAILY')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  reportType === 'DAILY'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>تقرير يومي</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('WEEKLY')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  reportType === 'WEEKLY'
                    ? 'bg-blue-50 text-blue-800 border-blue-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>تقرير أسبوعي</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('MONTHLY')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  reportType === 'MONTHLY'
                    ? 'bg-purple-50 text-purple-800 border-purple-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>تقرير شهري</span>
              </button>
            </div>
          </div>

          {/* 2. Report Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              عنوان التقرير <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: التقرير اليومي لسير العمل ونظافة الإقامة"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition"
              required
            />
          </div>

          {/* 3. Period Inputs (Customized by Type) */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            {reportType === 'DAILY' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  تاريخ التقرير اليومي <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  required
                />
              </div>
            )}

            {reportType === 'WEEKLY' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تاريخ بداية الأسبوع <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تاريخ نهاية الأسبوع <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 text-slate-800"
                    required
                  />
                </div>
              </div>
            )}

            {reportType === 'MONTHLY' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الشهر والسنة المشمولة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="month"
                    value={periodStart.substring(0, 7) || reportDate.substring(0, 7)}
                    onChange={(e) => {
                      setPeriodStart(e.target.value);
                      setReportDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 text-slate-800"
                    required
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center">
                  <span>يغطي هذا التقرير كامل حصيلة الشهر والمؤشرات الإحصائية العامة.</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700">
                محتوى وتفاصيل التقرير <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertSection('• ')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold border border-slate-200"
                >
                  + نقطة
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSection('5. الصعوبات والعوائق المطروحة:\n- ')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold border border-slate-200"
                >
                  + قسم الصعوبات
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب تفاصيل التقرير، مقسمة إلى فقرات ونقاط واضحة..."
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition font-sans"
              required
            />
          </div>

          {/* 5. Phase 2: Dedicated Attachments Section */}
          <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    المرفقات الرسمية الداعمة للتقرير
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    يمكنك إرفاق ملف واحد أو عدة ملفات (محاضر، جداول، صور ميدانية، مخططات)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  الحد الأقصى للملف: 10MB
                </span>
                {totalAttachmentsCount > 0 && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    المجموع: {totalAttachmentsCount} مرفق(ات)
                  </span>
                )}
              </div>
            </div>

            {/* Allowed types summary pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
              <span className="font-semibold text-slate-600">الأنواع المسموحة:</span>
              <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 font-mono">PDF</span>
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-mono">DOC / DOCX</span>
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-mono">XLS / XLSX</span>
              <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200 font-mono">PPT / PPTX</span>
              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-mono">JPG / PNG</span>
            </div>

            {/* Upload Selector Dropzone Area */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 bg-white transition text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <FileUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  اختر ملفات من جهازك لإرفاقها مع التقرير
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  يمكنك تحديد ملف واحد أو عدة ملفات معاً دفعة واحدة
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="report-files-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="mt-1 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <UploadCloud className="w-4 h-4 text-emerald-700" />
                <span>اختيار ملفات المرفقات...</span>
              </button>
            </div>

            {/* Existing attachments list (for edited reports) */}
            {isLoadingAttachments && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>جاري تحميل المرفقات السابقة...</span>
              </div>
            )}

            {existingAttachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 block">
                  المرفقات المحفوظة مسبقاً ({existingAttachments.length}):
                </span>
                <div className="space-y-1.5">
                  {existingAttachments.map(att => {
                    const info = getFileTypeInfo(att.original_filename);
                    const isDeleting = deletingAttachmentId === att.id;

                    return (
                      <div
                        key={att.id}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${info.bg}`}>
                            {info.label === 'صورة' ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 text-xs block truncate" title={att.original_filename}>
                              {att.original_filename}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>{formatFileSize(att.file_size)}</span>
                              <span>•</span>
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 rounded">مرفق محفوظ</span>
                            </div>
                          </div>
                        </div>

                        {/* Delete button (only allowed in DRAFT or NEEDS_REVISION) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingAttachment(att.id, att.original_filename)}
                          disabled={isDeleting || isSubmitting}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                          title="حذف هذا المرفق"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Staged new files list to be uploaded on save */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-800 block">
                  الملفات الجديدة المختارة للرفع ({selectedFiles.length}):
                </span>
                <div className="space-y-1.5">
                  {selectedFiles.map((file, idx) => {
                    const info = getFileTypeInfo(file.name);

                    return (
                      <div
                        key={idx}
                        className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${info.bg}`}>
                            {info.label === 'صورة' ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs block truncate" title={file.name}>
                              {file.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-medium">
                                جاهز للرفع عند الحفظ
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedFile(idx)}
                          disabled={isSubmitting}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                          title="إلغاء هذا الملف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalAttachmentsCount === 0 && !isLoadingAttachments && (
              <p className="text-[11px] text-slate-400 text-center py-1">
                لا توجد مرفقات مضافة حالياً. إضافة المرفقات اختيارية لدعم التقرير.
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>سيتم تسجيل التقرير رسمياً باسم مصلحتك: {user?.departmentName}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              إلغاء
            </button>

            {/* Save as draft */}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileEdit className="w-3.5 h-3.5" />
              )}
              <span>حفظ كمسودة</span>
            </button>

            {/* Submit to Director */}
            <button
              type="button"
              onClick={() => setShowConfirmSubmit(true)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-900/10 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال التقرير إلى المدير</span>
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modal before Final Submission to Director */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-60 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
              <Send className="w-5 h-5 text-amber-700" />
            </div>
            
            <h4 className="text-base font-bold text-slate-900 text-center">
              تأكيد إرسال التقرير والمرفقات إلى المدير
            </h4>

            <p className="text-xs text-slate-600 mt-2 text-center leading-relaxed">
              هل أنت متأكد من إرسال التقرير 
              {totalAttachmentsCount > 0 ? ` مع (${totalAttachmentsCount}) مرفق(ات) ` : ' '} 
              إلى المدير؟ بعد الإرسال لن تتمكن من تعديله إلا إذا أعاده المدير للمراجعة.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmSubmit(false);
                  handleSave(true);
                }}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'تأكيد الإرسال الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
