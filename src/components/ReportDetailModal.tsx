import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Report, ReportAttachment } from '../types/index.ts';
import { ReportStatusBadge, ReportTypeBadge } from './ReportBadge.tsx';
import { 
  X, 
  Building2, 
  User as UserIcon, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  FileEdit, 
  Trash2, 
  RotateCcw,
  ShieldCheck,
  Paperclip,
  Download,
  Loader2,
  FileText,
  Image,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface ReportDetailModalProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: (msg?: string) => void;
  onEditReport?: (report: Report) => void;
}

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

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  onRefresh,
  onEditReport
}) => {
  const { user, token } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Attachments state
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Revision prompt state
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  useEffect(() => {
    if (!isOpen || !report) return;

    setErrorMsg(null);
    setShowRevisionModal(false);

    // If report already has attachments loaded, set them
    if (report.attachments && Array.isArray(report.attachments)) {
      setAttachments(report.attachments);
    }

    // Always fetch fresh attachments from secure endpoint
    fetchAttachments(report.id);
  }, [report, isOpen, token]);

  const fetchAttachments = async (reportId: number) => {
    setIsLoadingAttachments(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/attachments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAttachments(data.data);
      }
    } catch (err) {
      console.error('Failed to load report attachments:', err);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  if (!isOpen || !report) return null;

  const isDirector = user?.role === 'DIRECTOR';
  const isOwner = user?.departmentId === report.department_id;

  // Secure attachment download
  const handleDownloadAttachment = async (att: ReportAttachment) => {
    setDownloadingId(att.id);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/reports/${report.id}/attachments/${att.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || 'غير مصرح لك بتحميل هذا المرفق');
        setDownloadingId(null);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg('حدث خطأ أثناء تحميل الملف من الخادم');
    } finally {
      setDownloadingId(null);
    }
  };

  // Director: Approve/Review
  const handleReview = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل اعتماد التقرير');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      onRefresh('تمت مراجعة واعتماد التقرير بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  // Director: Request Revision
  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      setErrorMsg('يرجى توضيح ملاحظات وتوجيهات التعديل المطلوبة');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/request-revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: revisionNotes.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل إعادة التقرير');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      setShowRevisionModal(false);
      onRefresh('تمت إعادة التقرير لرئيس المصلحة لإجراء التعديلات');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  // Head: Submit draft or revised report
  const handleSubmitNow = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل إرسال التقرير');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      onRefresh('تم إرسال التقرير إلى المدير بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  // Head: Delete Draft
  const handleDeleteDraft = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المسودة نهائياً؟')) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل حذف المسودة');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
      onRefresh('تم حذف المسودة بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم');
      setIsProcessing(false);
    }
  };

  const formatPeriod = () => {
    if (report.report_type === 'DAILY') {
      return report.report_date ? `تاريخ اليوم: ${report.report_date}` : 'غير محدد';
    }
    if (report.report_type === 'WEEKLY') {
      return `من ${report.period_start || '—'} إلى ${report.period_end || '—'}`;
    }
    if (report.report_type === 'MONTHLY') {
      return `شهر: ${report.period_start || report.report_date || '—'}`;
    }
    return '—';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <ReportTypeBadge type={report.report_type} size="md" />
              <ReportStatusBadge status={report.status} size="md" />
              <span className="text-[11px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                تقرير رقم #{report.id}
              </span>
              {attachments.length > 0 && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Paperclip className="w-3 h-3 text-emerald-600" />
                  <span>{attachments.length} مرفق(ات)</span>
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {report.title}
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Director Revision Notes Alert (if revision requested) */}
          {report.status === 'NEEDS_REVISION' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>ملاحظات وتوجيهات المدير لإعادة التعديل:</span>
              </div>
              <p className="text-xs text-rose-900 bg-white/90 p-3 rounded-lg border border-rose-200 leading-relaxed font-medium">
                {report.revision_notes || 'يرجى تدقيق معطيات هذا التقرير وإعادة إرساله.'}
              </p>
            </div>
          )}

          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">المصلحة:</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{report.dept_name}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">المعد / المسؤول:</span>
              <span className="font-bold text-slate-800 mt-0.5 block">{report.author_name}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">الفترة المغطاة:</span>
              <span className="font-bold text-emerald-800 mt-0.5 block">{formatPeriod()}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">تاريخ الإرسال:</span>
              <span className="font-bold text-slate-700 mt-0.5 block">
                {report.submitted_at 
                  ? new Date(report.submitted_at).toLocaleDateString('ar-DZ') 
                  : (report.status === 'DRAFT' ? 'لم يرسل (مسودة)' : '—')
                }
              </span>
            </div>
          </div>

          {/* Report Content */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
              <span>نص ومحتوى التقرير الرسمي:</span>
              <span className="text-[10px] text-slate-400">وثيقة إدارية رسمية</span>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {report.content}
            </div>
          </div>

          {/* Phase 2: Dedicated Attachments Section */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    المرفقات الرسمية ({attachments.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ملفات داعمة مؤمنة ومخزنة في خادم الإدارة (تحميل مشفر بالصلاحيات)
                  </p>
                </div>
              </div>

              {isLoadingAttachments && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>تحديث المرفقات...</span>
                </div>
              )}
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachments.map(att => {
                  const info = getFileTypeInfo(att.original_filename);
                  const isDownloading = downloadingId === att.id;

                  return (
                    <div
                      key={att.id}
                      className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-2xs transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${info.bg}`}>
                          {info.label === 'صورة' ? <Image className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block truncate group-hover:text-emerald-800" title={att.original_filename}>
                            {att.original_filename}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-medium text-slate-600">{formatFileSize(att.file_size)}</span>
                            <span>•</span>
                            <span>{new Date(att.created_at).toLocaleDateString('ar-DZ')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Download button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        disabled={isDownloading}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow-2xs"
                        title="تحميل المرفق بأمان"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        <span>تحميل</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                لا توجد ملفات مرفقة مع هذا التقرير.
              </div>
            )}
          </div>

          {/* Review Timestamp info if reviewed */}
          {report.reviewed_at && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تمت المراجعة والاعتماد رسمياً من قبل مدير الإقامة الجامعية.</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700">
                {new Date(report.reviewed_at).toLocaleDateString('ar-DZ')}
              </span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            إغلاق
          </button>

          {/* ACTIONS FOR DIRECTOR */}
          {isDirector && (
            <div className="flex items-center gap-2">
              {/* Request Revision button */}
              {report.status !== 'REVIEWED' && (
                <button
                  type="button"
                  onClick={() => {
                    setRevisionNotes(report.revision_notes || '');
                    setShowRevisionModal(true);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>إعادة التقرير للتعديل</span>
                </button>
              )}

              {/* Review/Approve button */}
              {report.status !== 'REVIEWED' && (
                <button
                  type="button"
                  onClick={handleReview}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>اعتماد ومراجعة التقرير</span>
                </button>
              )}
            </div>
          )}

          {/* ACTIONS FOR DEPARTMENT HEAD */}
          {!isDirector && isOwner && (
            <div className="flex items-center gap-2">
              {/* Delete draft */}
              {report.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={handleDeleteDraft}
                  disabled={isProcessing}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المسودة</span>
                </button>
              )}

              {/* Edit draft or revised report */}
              {['DRAFT', 'NEEDS_REVISION'].includes(report.status) && onEditReport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditReport(report);
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>تعديل التقرير والمرفقات</span>
                </button>
              )}

              {/* Submit draft or revised */}
              {['DRAFT', 'NEEDS_REVISION'].includes(report.status) && (
                <button
                  type="button"
                  onClick={handleSubmitNow}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال إلى المدير</span>
                </button>
              )}

              {/* Readonly info badge if locked */}
              {['SUBMITTED', 'UNDER_REVIEW', 'REVIEWED'].includes(report.status) && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>التقرير مرسل للإدارة ومقفل عن التعديل</span>
                </span>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Director Revision Notes Prompt Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-60 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-700" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                إعادة التقرير للتعديل إلى {report.dept_name}
              </h4>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              يرجى كتابة الملاحظات والتوجيهات المطلوبة لرئيس المصلحة بدقة:
            </p>

            <textarea
              rows={4}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="مثال: يرجى إضافة تفاصيل دقيقة حول أعطال شبكة التدفئة وإرفاق محضر المعاينة التقنية..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 mb-4"
              required
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRequestRevision}
                disabled={isProcessing}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {isProcessing ? 'جاري الإرسال...' : 'تأكيد إعادة التقرير'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
