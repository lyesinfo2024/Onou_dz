import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { executeQuery, executeRun, executeInsert, DepartmentRow, UserRow, ReportRow, AttachmentRow, DirectiveRow, DirectiveDepartmentStatusRow, DirectorateRow, SubscriptionRow } from './db.ts';
import { authMiddleware, AuthenticatedRequest, loginUser, ROLE_PERMISSIONS, requireSuperAdmin } from './auth.ts';

const router = Router();

// 1. Auth routes
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password, directorateId, directorate_id } = req.body;
    const selectedDir = directorateId !== undefined ? directorateId : directorate_id;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور' });
    }

    const result = await loginUser(identifier, password, selectedDir);
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء تسجيل الدخول' });
  }
});

router.get('/auth/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userSession = req.user!;
    const users = await executeQuery<UserRow & { 
      dept_name?: string; 
      dept_code?: string; 
      dept_desc?: string;
      directorate_name?: string;
      directorate_code?: string;
    }>(
      `SELECT u.*, 
              d.name as dept_name, d.code as dept_code, d.description as dept_desc,
              dir.name as directorate_name, dir.code as directorate_code
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       LEFT JOIN directorates dir ON u.directorate_id = dir.id
       WHERE u.id = ? AND u.is_active = 1`,
      [userSession.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const u = users[0];
    const perm = ROLE_PERMISSIONS[u.role];

    let subscription: { status: string; end_date: string; is_expired: boolean } | null = null;
    if (u.directorate_id) {
      const subRes = await executeQuery<{ status: string; end_date: string }>(
        `SELECT status, end_date FROM subscriptions WHERE directorate_id = ? ORDER BY id DESC LIMIT 1`,
        [u.directorate_id]
      );
      if (subRes.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        subscription = {
          status: subRes[0].status,
          end_date: subRes[0].end_date,
          is_expired: subRes[0].status !== 'ACTIVE' || (subRes[0].end_date < today)
        };
      }
    }

    res.json({
      success: true,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        roleName: perm.roleName,
        directorateId: u.directorate_id,
        directorateName: u.directorate_name,
        directorateCode: u.directorate_code,
        departmentId: u.department_id,
        departmentName: u.dept_name,
        departmentCode: u.dept_code,
        departmentDescription: u.dept_desc,
        phone: u.phone,
        lastLogin: u.last_login,
        permissions: perm.permissions,
        scope: perm.scope,
        subscription
      }
    });
  } catch (error: any) {
    console.error('Fetch me error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

// 2. Departments routes
router.get('/departments', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role === 'SUPER_ADMIN') {
      const { directorate_id } = req.query;
      let sql = `
        SELECT d.*, 
               u.full_name as head_name, 
               u.email as head_email, 
               u.phone as head_phone,
               u.id as head_id,
               dir.name as directorate_name,
               dir.code as directorate_code
        FROM departments d
        LEFT JOIN directorates dir ON d.directorate_id = dir.id
        LEFT JOIN users u ON u.department_id = d.id AND u.role = 'DEPARTMENT_HEAD'
      `;
      const params: any[] = [];
      if (directorate_id) {
        sql += ` WHERE d.directorate_id = ?`;
        params.push(parseInt(directorate_id as string, 10));
      }
      sql += ` ORDER BY d.directorate_id ASC, d.id ASC`;
      const departments = await executeQuery<DepartmentRow & { head_name?: string; head_email?: string; head_phone?: string; head_id?: number; directorate_name?: string; directorate_code?: string }>(sql, params);
      return res.json({ success: true, data: departments });
    }

    if (user.role === 'DIRECTOR') {
      // Director: Can view all departments in their assigned directorate ONLY
      const departments = await executeQuery<DepartmentRow & { head_name?: string; head_email?: string; head_phone?: string; head_id?: number; directorate_name?: string }>(
        `SELECT d.*, 
                u.full_name as head_name, 
                u.email as head_email, 
                u.phone as head_phone,
                u.id as head_id,
                dir.name as directorate_name
         FROM departments d
         LEFT JOIN directorates dir ON d.directorate_id = dir.id
         LEFT JOIN users u ON u.department_id = d.id AND u.role = 'DEPARTMENT_HEAD'
         WHERE d.directorate_id = ?
         ORDER BY d.id ASC`,
        [user.directorate_id]
      );

      return res.json({
        success: true,
        data: departments
      });
    }

    if (user.role === 'DEPARTMENT_HEAD') {
      // Security Enforcement: Department Head can ONLY view their own department.
      // Backend completely filters the database query using the verified JWT department_id and directorate_id.
      if (!user.department_id) {
        return res.status(403).json({
          success: false,
          error: 'محظور أمنياً: لا يوجد مصلحة مرتبطة بهذا الحساب'
        });
      }

      const departments = await executeQuery<DepartmentRow & { head_name?: string; head_email?: string; head_phone?: string; head_id?: number; directorate_name?: string }>(
        `SELECT d.*, 
                u.full_name as head_name, 
                u.email as head_email, 
                u.phone as head_phone,
                u.id as head_id,
                dir.name as directorate_name
         FROM departments d
         LEFT JOIN directorates dir ON d.directorate_id = dir.id
         LEFT JOIN users u ON u.department_id = d.id AND u.role = 'DEPARTMENT_HEAD'
         WHERE d.id = ? AND d.directorate_id = ?`,
        [user.department_id, user.directorate_id]
      );

      return res.json({
        success: true,
        data: departments
      });
    }

    return res.status(403).json({
      success: false,
      error: 'نوع الحساب غير مصرح له باستعراض المصالح'
    });
  } catch (error: any) {
    console.error('Departments error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع بيانات المصالح' });
  }
});

router.get('/departments/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedDeptId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(requestedDeptId)) {
      return res.status(400).json({ success: false, error: 'معرف المصلحة غير صحيح' });
    }

    // STRICT BACKEND RBAC SECURITY ENFORCEMENT:
    // If the caller is a Department Head, they are strictly forbidden from viewing any other department.
    if (user.role === 'DEPARTMENT_HEAD') {
      if (user.department_id !== requestedDeptId) {
        const now = new Date().toISOString();
        await executeRun(
          `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.directorate_id,
            user.id,
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            `محاولة غير مصرح بها من رئيس مصلحة (dept_id: ${user.department_id}) للوصول إلى المصلحة رقم: ${requestedDeptId}`,
            req.ip || '127.0.0.1',
            now
          ]
        ).catch(() => {});

        return res.status(403).json({
          success: false,
          error: 'محظور أمنياً: غير مصرح لك بالوصول إلى بيانات مصلحة أخرى غير مصلحتك المعين عليها'
        });
      }
    }

    // Query single department with its head details
    const depts = await executeQuery<DepartmentRow & { head_name?: string; head_email?: string; head_phone?: string; directorate_name?: string }>(
      `SELECT d.*, 
              u.full_name as head_name, 
              u.email as head_email, 
              u.phone as head_phone,
              dir.name as directorate_name
       FROM departments d
       LEFT JOIN directorates dir ON d.directorate_id = dir.id
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'DEPARTMENT_HEAD'
       WHERE d.id = ?`,
      [requestedDeptId]
    );

    if (depts.length === 0) {
      return res.status(404).json({ success: false, error: 'المصلحة غير موجودة' });
    }

    const dept = depts[0];

    // Directorate tenant verification: Director can ONLY access departments in their own directorate
    if (user.role === 'DIRECTOR' && dept.directorate_id !== user.directorate_id) {
      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: هذه المصلحة تابعة لمديرية أخرى وغير مصرح لك بالاطلاع عليها'
      });
    }

    res.json({
      success: true,
      data: dept
    });
  } catch (error: any) {
    console.error('Department detail error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع بيانات المصلحة' });
  }
});

// Direct endpoint to retrieve the caller's own department securely
router.get('/my-department', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'DEPARTMENT_HEAD' || !user.department_id) {
      return res.status(400).json({
        success: false,
        error: 'هذا المسار مخصص لرؤساء المصالح المعينين فقط'
      });
    }

    const depts = await executeQuery<DepartmentRow & { head_name?: string; head_email?: string; head_phone?: string; directorate_name?: string }>(
      `SELECT d.*, 
              u.full_name as head_name, 
              u.email as head_email, 
              u.phone as head_phone,
              dir.name as directorate_name
       FROM departments d
       LEFT JOIN directorates dir ON d.directorate_id = dir.id
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'DEPARTMENT_HEAD'
       WHERE d.id = ? AND d.directorate_id = ?`,
      [user.department_id, user.directorate_id]
    );

    if (depts.length === 0) {
      return res.status(404).json({ success: false, error: 'بيانات مصلحتك غير موجودة' });
    }

    res.json({
      success: true,
      data: depts[0]
    });
  } catch (error: any) {
    console.error('My department error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع بيانات مصلحتك' });
  }
});

// 3. Users list route (strictly controlled by role and tenant)
router.get('/users', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role === 'SUPER_ADMIN') {
      const { directorate_id, role } = req.query;
      let sql = `
        SELECT u.id, u.username, u.email, u.full_name, u.role, u.directorate_id, u.department_id, u.phone, u.is_active, u.created_at, u.last_login,
               d.name as dept_name, d.code as dept_code,
               dir.name as directorate_name, dir.code as directorate_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN directorates dir ON u.directorate_id = dir.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (directorate_id) {
        sql += ` AND u.directorate_id = ?`;
        params.push(parseInt(directorate_id as string, 10));
      }
      if (role) {
        sql += ` AND u.role = ?`;
        params.push(role);
      }
      sql += ` ORDER BY u.directorate_id ASC, u.role DESC, u.id ASC`;
      const allUsers = await executeQuery<Omit<UserRow, 'password_hash'> & { dept_name?: string; directorate_name?: string; directorate_code?: string }>(sql, params);
      return res.json({ success: true, data: allUsers });
    }

    if (user.role === 'DIRECTOR') {
      // Director: Can see all users and all department heads IN THEIR DIRECTORATE ONLY
      const allUsers = await executeQuery<Omit<UserRow, 'password_hash'> & { dept_name?: string; directorate_name?: string }>(
        `SELECT u.id, u.username, u.email, u.full_name, u.role, u.directorate_id, u.department_id, u.phone, u.is_active, u.created_at, u.last_login,
                d.name as dept_name,
                dir.name as directorate_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN directorates dir ON u.directorate_id = dir.id
         WHERE u.directorate_id = ?
         ORDER BY u.role DESC, u.id ASC`,
        [user.directorate_id]
      );
      return res.json({ success: true, data: allUsers });
    } else {
      // Department Head: CANNOT see other department heads or full user directory.
      // Can ONLY see their own user profile.
      const selfUser = await executeQuery<Omit<UserRow, 'password_hash'> & { dept_name?: string; directorate_name?: string }>(
        `SELECT u.id, u.username, u.email, u.full_name, u.role, u.directorate_id, u.department_id, u.phone, u.is_active, u.created_at, u.last_login,
                d.name as dept_name,
                dir.name as directorate_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN directorates dir ON u.directorate_id = dir.id
         WHERE u.id = ?`,
        [user.id]
      );
      return res.json({ success: true, data: selfUser });
    }
  } catch (error: any) {
    console.error('Users error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع قائمة المستخدمين' });
  }
});

// 4. Phase 2: Administrative Reports System API
// GET /api/reports - Fetch reports with strict departmental and tenant isolation
router.get('/reports', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { department_id, report_type, status, limit, directorate_id } = req.query;

    let sql = `
      SELECT r.*,
             d.name as dept_name,
             d.code as dept_code,
             dir.name as directorate_name,
             dir.code as directorate_code,
             u.full_name as author_name,
             u.email as author_email,
             (SELECT COUNT(*) FROM report_attachments a WHERE a.report_id = r.id) as attachments_count
      FROM reports r
      JOIN departments d ON r.department_id = d.id
      LEFT JOIN directorates dir ON r.directorate_id = dir.id
      JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'SUPER_ADMIN') {
      if (directorate_id) {
        sql += ` AND r.directorate_id = ?`;
        params.push(parseInt(directorate_id as string, 10));
      }
      if (department_id) {
        sql += ` AND r.department_id = ?`;
        params.push(parseInt(department_id as string, 10));
      }
      if (status) {
        sql += ` AND r.status = ?`;
        params.push(status);
      }
    } else if (user.role === 'DIRECTOR') {
      // Director sees all reports across departments in their assigned directorate ONLY
      sql += ` AND r.directorate_id = ?`;
      params.push(user.directorate_id);

      if (department_id) {
        sql += ` AND r.department_id = ?`;
        params.push(parseInt(department_id as string, 10));
      }
      if (!status) {
        sql += ` AND r.status != 'DRAFT'`;
      } else {
        sql += ` AND r.status = ?`;
        params.push(status);
      }
    } else {
      // STRICT SECURITY ENFORCEMENT:
      // Department head CANNOT view reports of other departments or other directorates.
      sql += ` AND r.department_id = ? AND r.directorate_id = ?`;
      params.push(user.department_id, user.directorate_id);

      if (status) {
        sql += ` AND r.status = ?`;
        params.push(status);
      }
    }

    if (report_type) {
      sql += ` AND r.report_type = ?`;
      params.push(report_type);
    }

    sql += ` ORDER BY r.created_at DESC`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(limit as string, 10));
    }

    const reports = await executeQuery<ReportRow>(sql, params);

    res.json({
      success: true,
      data: reports
    });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع التقارير الإدارية' });
  }
});

// GET /api/reports/stats - Aggregated stats for dashboards
router.get('/reports/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let filterClause = '';
    const params: any[] = [];

    if (user.role === 'SUPER_ADMIN') {
      if (req.query.directorate_id) {
        filterClause = 'WHERE directorate_id = ?';
        params.push(parseInt(req.query.directorate_id as string, 10));
      }
    } else if (user.role === 'DIRECTOR') {
      filterClause = 'WHERE directorate_id = ?';
      params.push(user.directorate_id);
    } else {
      filterClause = 'WHERE department_id = ? AND directorate_id = ?';
      params.push(user.department_id, user.directorate_id);
    }

    const allReports = await executeQuery<ReportRow>(
      `SELECT status, report_type FROM reports ${filterClause}`,
      params
    );

    const stats = {
      total: allReports.length,
      drafts: allReports.filter(r => r.status === 'DRAFT').length,
      submitted: allReports.filter(r => r.status === 'SUBMITTED').length,
      under_review: allReports.filter(r => r.status === 'UNDER_REVIEW').length,
      needs_revision: allReports.filter(r => r.status === 'NEEDS_REVISION').length,
      reviewed: allReports.filter(r => r.status === 'REVIEWED').length,
      daily: allReports.filter(r => r.report_type === 'DAILY').length,
      weekly: allReports.filter(r => r.report_type === 'WEEKLY').length,
      monthly: allReports.filter(r => r.report_type === 'MONTHLY').length,
    };

    // Also fetch top 5 recent submitted reports
    let recentSql = `
      SELECT r.*,
             d.name as dept_name,
             d.code as dept_code,
             u.full_name as author_name
      FROM reports r
      JOIN departments d ON r.department_id = d.id
      JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;
    const recentParams: any[] = [];

    if (user.role === 'SUPER_ADMIN') {
      if (req.query.directorate_id) {
        recentSql += ` AND r.directorate_id = ?`;
        recentParams.push(parseInt(req.query.directorate_id as string, 10));
      }
    } else if (user.role === 'DIRECTOR') {
      recentSql += ` AND r.directorate_id = ? AND r.status != 'DRAFT'`;
      recentParams.push(user.directorate_id);
    } else {
      recentSql += ` AND r.department_id = ? AND r.directorate_id = ?`;
      recentParams.push(user.department_id, user.directorate_id);
    }

    recentSql += ` ORDER BY r.created_at DESC LIMIT 5`;
    const recentReports = await executeQuery<ReportRow>(recentSql, recentParams);

    res.json({
      success: true,
      stats,
      recent: recentReports
    });
  } catch (error: any) {
    console.error('Reports stats error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع إحصائيات التقارير' });
  }
});

// GET /api/reports/:id - Fetch single report with security verification
router.get('/reports/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(reportId)) {
      return res.status(400).json({ success: false, error: 'معرف التقرير غير صحيح' });
    }

    const reports = await executeQuery<ReportRow>(
      `SELECT r.*,
              d.name as dept_name,
              d.code as dept_code,
              dir.name as directorate_name,
              u.full_name as author_name,
              u.email as author_email
       FROM reports r
       JOIN departments d ON r.department_id = d.id
       LEFT JOIN directorates dir ON r.directorate_id = dir.id
       JOIN users u ON r.created_by = u.id
       WHERE r.id = ?`,
      [reportId]
    );

    if (reports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const report = reports[0];

    // STRICT ACCESS CONTROL & TENANT ISOLATION:
    if (user.role === 'DIRECTOR' && report.directorate_id !== user.directorate_id) {
      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: لا يمكنك الاطلاع على تقارير تابعة لمديرية أخرى'
      });
    }

    if (user.role === 'DEPARTMENT_HEAD') {
      if (report.department_id !== user.department_id || report.directorate_id !== user.directorate_id) {
        const now = new Date().toISOString();
        await executeRun(
          `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.directorate_id,
            user.id,
            'UNAUTHORIZED_REPORT_ACCESS_ATTEMPT',
            `محاولة غير مصرح بها من رئيس مصلحة (dept_id: ${user.department_id}) لفتح التقرير رقم #${reportId} التابع لمصلحة #${report.department_id}`,
            req.ip || '127.0.0.1',
            now
          ]
        ).catch(() => {});

        return res.status(403).json({
          success: false,
          error: 'محظور أمنياً: غير مصرح لك بالاطلاع على تقرير تابع لمصلحة أخرى'
        });
      }
    }

    // Fetch attachments belonging to this report
    const attachments = await executeQuery<Omit<AttachmentRow, 'storage_path'>>(
      `SELECT a.id, a.report_id, a.original_filename, a.stored_filename, a.mime_type, a.file_size, a.uploaded_by, a.created_at,
              u.full_name as uploader_name
       FROM report_attachments a
       JOIN users u ON a.uploaded_by = u.id
       WHERE a.report_id = ?
       ORDER BY a.id ASC`,
      [reportId]
    );

    res.json({
      success: true,
      data: {
        ...report,
        attachments_count: attachments.length,
        attachments
      }
    });
  } catch (error: any) {
    console.error('Report detail error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع بيانات التقرير' });
  }
});

// POST /api/reports - Create new report (Draft or Submitted)
router.post('/reports', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== 'DEPARTMENT_HEAD') {
      return res.status(403).json({
        success: false,
        error: 'صلاحية غير كافية: إعداد ورفع التقارير مخصص لرؤساء المصالح المعنيين'
      });
    }

    const { report_type, title, report_date, period_start, period_end, content, status } = req.body;

    // Validation
    if (!report_type || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(report_type)) {
      return res.status(400).json({ success: false, error: 'نوع التقرير غير صحيح (يومي، أسبوعي، شهري)' });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال عنوان واضح ومناسب للتقرير' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة محتوى وتفاصيل التقرير' });
    }

    // Period validation
    if (report_type === 'DAILY' && !report_date) {
      return res.status(400).json({ success: false, error: 'تاريخ التقرير اليومي مطلوب' });
    }

    if (report_type === 'WEEKLY' && (!period_start || !period_end)) {
      return res.status(400).json({ success: false, error: 'تاريخ بداية ونهاية الفترة مطلوب للتقرير الأسبوعي' });
    }

    if (report_type === 'MONTHLY' && !period_start && !report_date) {
      return res.status(400).json({ success: false, error: 'تحديد الشهر والسنة مطلوب للتقرير الشهري' });
    }

    const finalStatus = status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';
    const now = new Date().toISOString();
    const submittedAt = finalStatus === 'SUBMITTED' ? now : null;

    // STRICT DEPARTMENT & DIRECTORATE BINDING:
    const deptId = user.department_id;
    const authorId = user.id;
    const dirId = user.directorate_id;

    const newId = await executeInsert(
      `INSERT INTO reports (
        directorate_id, department_id, created_by, report_type, title, 
        report_date, period_start, period_end, content, 
        status, submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dirId,
        deptId,
        authorId,
        report_type,
        title.trim(),
        report_date || null,
        period_start || null,
        period_end || null,
        content.trim(),
        finalStatus,
        submittedAt,
        now,
        now
      ]
    );

    // Log Activity
    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dirId,
        user.id,
        finalStatus === 'SUBMITTED' ? 'REPORT_SUBMITTED' : 'REPORT_DRAFT_SAVED',
        `${finalStatus === 'SUBMITTED' ? 'إرسال' : 'حفظ مسودة'} تقرير ${report_type} بعنوان: "${title.trim()}" (رقم #${newId})`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.status(201).json({
      success: true,
      message: finalStatus === 'SUBMITTED' ? 'تم إرسال التقرير إلى المدير بنجاح' : 'تم حفظ مسودة التقرير بنجاح',
      reportId: newId
    });
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء حفظ التقرير' });
  }
});

// PUT /api/reports/:id - Edit an existing report (Only allowed if DRAFT or NEEDS_REVISION)
router.put('/reports/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(reportId)) {
      return res.status(400).json({ success: false, error: 'معرف التقرير غير صحيح' });
    }

    // Verify existing report
    const existingReports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (existingReports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const report = existingReports[0];

    // Security check: Only the owning department head can edit
    if (user.role === 'DEPARTMENT_HEAD' && report.department_id !== user.department_id) {
      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: لا يمكنك تعديل تقارير المصالح الأخرى'
      });
    }

    // Status check: Cannot edit if already SUBMITTED or REVIEWED unless returned for revision
    if (!['DRAFT', 'NEEDS_REVISION'].includes(report.status)) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن تعديل التقرير لأنه تم إرساله مسبقاً إلى المدير وهو قيد المراجعة أو معتمد'
      });
    }

    const { report_type, title, report_date, period_start, period_end, content } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال عنوان واضح للتقرير' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة محتوى التقرير' });
    }

    const now = new Date().toISOString();

    await executeRun(
      `UPDATE reports SET
        report_type = COALESCE(?, report_type),
        title = ?,
        report_date = ?,
        period_start = ?,
        period_end = ?,
        content = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        report_type || report.report_type,
        title.trim(),
        report_date || report.report_date,
        period_start || report.period_start,
        period_end || report.period_end,
        content.trim(),
        now,
        reportId
      ]
    );

    // Log Activity
    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'REPORT_UPDATED',
        `تعديل محتوى التقرير رقم #${reportId} بعنوان: "${title.trim()}"`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم تحديث التقرير بنجاح'
    });
  } catch (error: any) {
    console.error('Update report error:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث التقرير' });
  }
});

// DELETE /api/reports/:id - Delete draft report
router.delete('/reports/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(reportId)) {
      return res.status(400).json({ success: false, error: 'معرف التقرير غير صحيح' });
    }

    const existingReports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (existingReports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const report = existingReports[0];

    // Security check
    if (user.role === 'DEPARTMENT_HEAD' && report.department_id !== user.department_id) {
      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: لا يمكنك حذف تقارير المصالح الأخرى'
      });
    }

    // Only DRAFT can be deleted
    if (report.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف تقرير بعد إرساله للمدير. الحذف متاح للمسودات فقط.'
      });
    }

    // Clean up any attachments and physical files associated with this draft report
    const reportAttachments = await executeQuery<AttachmentRow>(
      `SELECT * FROM report_attachments WHERE report_id = ?`,
      [reportId]
    );

    for (const att of reportAttachments) {
      if (att.storage_path && fs.existsSync(att.storage_path)) {
        try {
          fs.unlinkSync(att.storage_path);
        } catch (e) {
          console.warn('Could not remove file for deleted draft report:', e);
        }
      }
    }

    await executeRun(`DELETE FROM report_attachments WHERE report_id = ?`, [reportId]);
    await executeRun(`DELETE FROM reports WHERE id = ?`, [reportId]);

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'REPORT_DELETED',
        `حذف مسودة التقرير رقم #${reportId}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم حذف المسودة بنجاح'
    });
  } catch (error: any) {
    console.error('Delete report error:', error);
    res.status(500).json({ success: false, error: 'فشل حذف التقرير' });
  }
});

// POST /api/reports/:id/submit - Submit report to Director
router.post('/reports/:id/submit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const user = req.user!;

    const existingReports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (existingReports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const report = existingReports[0];

    // Security check
    if (user.role === 'DEPARTMENT_HEAD' && report.department_id !== user.department_id) {
      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: لا يمكنك إرسال تقارير مصالح أخرى'
      });
    }

    if (!['DRAFT', 'NEEDS_REVISION'].includes(report.status)) {
      return res.status(400).json({
        success: false,
        error: 'هذا التقرير تم إرساله مسبقاً وهو قيد المتابعة'
      });
    }

    const now = new Date().toISOString();

    await executeRun(
      `UPDATE reports SET
        status = 'SUBMITTED',
        submitted_at = ?,
        updated_at = ?
       WHERE id = ?`,
      [now, now, reportId]
    );

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'REPORT_SUBMITTED',
        `إرسال التقرير رقم #${reportId} إلى المدير بعد الإعداد/المراجعة`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم إرسال التقرير إلى المدير بنجاح'
    });
  } catch (error: any) {
    console.error('Submit report error:', error);
    res.status(500).json({ success: false, error: 'فشل إرسال التقرير' });
  }
});

// POST /api/reports/:id/review - Director approves/reviews report
router.post('/reports/:id/review', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (user.role !== 'DIRECTOR') {
      return res.status(403).json({
        success: false,
        error: 'صلاحية غير كافية: مراجعة واعتماد التقارير من صلاحية مدير الإقامة الجامعية حصراً'
      });
    }

    const existingReports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (existingReports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const now = new Date().toISOString();

    await executeRun(
      `UPDATE reports SET
        status = 'REVIEWED',
        reviewed_at = ?,
        updated_at = ?
       WHERE id = ?`,
      [now, now, reportId]
    );

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'REPORT_REVIEWED',
        `اعتماد ومراجعة التقرير رقم #${reportId} من قبل المدير`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تمت مراجعة واعتماد التقرير بنجاح'
    });
  } catch (error: any) {
    console.error('Review report error:', error);
    res.status(500).json({ success: false, error: 'فشل تسجيل مراجعة التقرير' });
  }
});

// POST /api/reports/:id/request-revision - Director returns report for revision
router.post('/reports/:id/request-revision', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const user = req.user!;
    const { notes } = req.body;

    if (user.role !== 'DIRECTOR') {
      return res.status(403).json({
        success: false,
        error: 'صلاحية غير كافية: إعادة التقارير للتعديل من صلاحية المدير فقط'
      });
    }

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'يرجى كتابة ملاحظات وتوجيهات التعديل المطلوبة لرئيس المصلحة'
      });
    }

    const existingReports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (existingReports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const now = new Date().toISOString();

    await executeRun(
      `UPDATE reports SET
        status = 'NEEDS_REVISION',
        revision_notes = ?,
        updated_at = ?
       WHERE id = ?`,
      [notes.trim(), now, reportId]
    );

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'REPORT_REVISION_REQUESTED',
        `إعادة التقرير رقم #${reportId} للتعديل مع الملاحظات: "${notes.trim()}"`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تمت إعادة التقرير لرئيس المصلحة لإجراء التعديلات المطلوبة'
    });
  } catch (error: any) {
    console.error('Request revision error:', error);
    res.status(500).json({ success: false, error: 'فشل إعادة التقرير للتعديل' });
  }
});

// ==========================================
// 5. Phase 2: Report Attachments Subsystem
// ==========================================

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads', 'attachments');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png'
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.com', '.scr',
  '.msi', '.dll', '.bin', '.app', '.deb', '.apk', '.rpm', '.jar',
  '.ps1', '.py', '.php', '.phtml', '.asp', '.aspx', '.jsp'
]);

// Multer storage engine - saves physical files securely outside public web root
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per file
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error('محظور أمنياً: الملفات التنفيذية والبرمجية غير مسموح بها بتاتاً'));
    }
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
      return cb(new Error('نوع الملف غير مسموح به. الأنواع المسموحة: PDF, Word, Excel, PowerPoint, الصور (JPG, PNG)'));
    }
    cb(null, true);
  }
});

// GET /api/reports/:reportId/attachments - List all attachments for a report
router.get('/reports/:reportId/attachments', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.reportId, 10);
    const user = req.user!;

    if (isNaN(reportId)) {
      return res.status(400).json({ success: false, error: 'معرف التقرير غير صحيح' });
    }

    const reports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const report = reports[0];

    // Security check: Department head can only view attachments of own department
    if (user.role === 'DEPARTMENT_HEAD' && report.department_id !== user.department_id) {
      const now = new Date().toISOString();
      await executeRun(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          'UNAUTHORIZED_ATTACHMENT_ACCESS_ATTEMPT',
          `محاولة غير مصرح بها من رئيس مصلحة (dept_id: ${user.department_id}) لعرض قائمة مرفقات التقرير رقم #${reportId} التابع لمصلحة #${report.department_id}`,
          req.ip || '127.0.0.1',
          now
        ]
      ).catch(() => {});

      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: غير مصرح لك باستعراض مرفقات مصلحة أخرى'
      });
    }

    const attachments = await executeQuery<Omit<AttachmentRow, 'storage_path'>>(
      `SELECT a.id, a.report_id, a.original_filename, a.stored_filename, a.mime_type, a.file_size, a.uploaded_by, a.created_at,
              u.full_name as uploader_name
       FROM report_attachments a
       JOIN users u ON a.uploaded_by = u.id
       WHERE a.report_id = ?
       ORDER BY a.id ASC`,
      [reportId]
    );

    res.json({
      success: true,
      data: attachments
    });
  } catch (error: any) {
    console.error('List attachments error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع مرفقات التقرير' });
  }
});

// POST /api/reports/:reportId/attachments - Upload attachments for a draft or revised report
router.post('/reports/:reportId/attachments', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  attachmentUpload.array('files', 10)(req, res, async (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (10MB)'
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'فشل رفع الملفات'
      });
    }

    try {
      const reportId = parseInt(req.params.reportId, 10);
      const user = req.user!;

      if (isNaN(reportId)) {
        return res.status(400).json({ success: false, error: 'معرف التقرير غير صحيح' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'لم يتم اختيار أي ملف للرفع' });
      }

      const reports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
      if (reports.length === 0) {
        // Remove uploaded files if report not found
        files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
      }

      const report = reports[0];

      // Security check: Only owning department head can add attachments
      if (user.role !== 'DEPARTMENT_HEAD' || report.department_id !== user.department_id) {
        files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        const now = new Date().toISOString();
        await executeRun(
          `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
          [
            user.id,
            'UNAUTHORIZED_ATTACHMENT_ACCESS_ATTEMPT',
            `محاولة غير مصرح بها من مستخدم لرفع مرفق على التقرير رقم #${reportId}`,
            req.ip || '127.0.0.1',
            now
          ]
        ).catch(() => {});

        return res.status(403).json({
          success: false,
          error: 'محظور أمنياً: لا يمكنك رفع مرفقات لتقرير تابع لمصلحة أخرى'
        });
      }

      // Status check: Attachments can only be added to DRAFT or NEEDS_REVISION
      if (!['DRAFT', 'NEEDS_REVISION'].includes(report.status)) {
        files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        return res.status(400).json({
          success: false,
          error: 'لا يمكن إضافة مرفقات بعد إرسال التقرير للإدارة إلا إذا أعاده المدير للتعديل'
        });
      }

      const now = new Date().toISOString();
      const savedAttachments = [];

      for (const file of files) {
        // Sanitize original filename to strictly prevent any path traversal characters
        const safeOriginalName = path.basename(file.originalname).replace(/[\/\\]/g, '').trim() || 'attachment';

        const insertId = await executeInsert(
          `INSERT INTO report_attachments (
            report_id, original_filename, stored_filename, mime_type, file_size, storage_path, uploaded_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reportId,
            safeOriginalName,
            file.filename,
            file.mimetype,
            file.size,
            file.path,
            user.id,
            now
          ]
        );

        await executeRun(
          `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
          [
            user.id,
            'ATTACHMENT_UPLOADED',
            `رفع مرفق "${safeOriginalName}" (${(file.size / 1024).toFixed(1)} KB) للتقرير رقم #${reportId}`,
            req.ip || '127.0.0.1',
            now
          ]
        );

        savedAttachments.push({
          id: insertId,
          report_id: reportId,
          original_filename: safeOriginalName,
          stored_filename: file.filename,
          mime_type: file.mimetype,
          file_size: file.size,
          created_at: now
        });
      }

      res.status(201).json({
        success: true,
        message: 'تم رفع المرفقات بنجاح',
        data: savedAttachments
      });
    } catch (error: any) {
      console.error('Save attachment error:', error);
      res.status(500).json({ success: false, error: 'حدث خطأ أثناء حفظ بيانات المرفقات' });
    }
  });
});

// DELETE /api/reports/:reportId/attachments/:attachmentId - Delete an attachment
router.delete('/reports/:reportId/attachments/:attachmentId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.reportId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const user = req.user!;

    if (isNaN(reportId) || isNaN(attachmentId)) {
      return res.status(400).json({ success: false, error: 'المعاملات غير صحيحة' });
    }

    const reports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const report = reports[0];

    // Security check: Only owning department head can delete attachment
    if (user.role !== 'DEPARTMENT_HEAD' || report.department_id !== user.department_id) {
      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: لا يمكنك حذف مرفق تابع لمصلحة أخرى'
      });
    }

    // Status check
    if (!['DRAFT', 'NEEDS_REVISION'].includes(report.status)) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف مرفقات بعد إرسال التقرير للإدارة'
      });
    }

    const attachments = await executeQuery<AttachmentRow>(
      `SELECT * FROM report_attachments WHERE id = ? AND report_id = ?`,
      [attachmentId, reportId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ success: false, error: 'المرفق غير موجود أو لا ينتمي لهذا التقرير' });
    }

    const att = attachments[0];

    // Delete physical file from disk if exists
    if (att.storage_path && fs.existsSync(att.storage_path)) {
      try {
        fs.unlinkSync(att.storage_path);
      } catch (err) {
        console.warn('Could not delete physical attachment file:', err);
      }
    }

    // Delete database record
    await executeRun(`DELETE FROM report_attachments WHERE id = ?`, [attachmentId]);

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'ATTACHMENT_DELETED',
        `حذف المرفق "${att.original_filename}" من التقرير رقم #${reportId}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم حذف المرفق بنجاح'
    });
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ success: false, error: 'فشل حذف المرفق' });
  }
});

// GET /api/reports/:reportId/attachments/:attachmentId/download - Secure download endpoint
router.get('/reports/:reportId/attachments/:attachmentId/download', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.reportId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const user = req.user!;

    if (isNaN(reportId) || isNaN(attachmentId)) {
      return res.status(400).json({ success: false, error: 'المعاملات غير صحيحة' });
    }

    const reports = await executeQuery<ReportRow>(`SELECT * FROM reports WHERE id = ?`, [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ success: false, error: 'التقرير غير موجود' });
    }

    const report = reports[0];

    // Verify attachment exists and strictly belongs to this report
    const attachments = await executeQuery<AttachmentRow>(
      `SELECT * FROM report_attachments WHERE id = ? AND report_id = ?`,
      [attachmentId, reportId]
    );

    if (attachments.length === 0) {
      return res.status(404).json({ success: false, error: 'المرفق غير موجود أو لا ينتمي لهذا التقرير' });
    }

    const att = attachments[0];

    // STRICT ROLE-BASED ACCESS CONTROL (RBAC):
    // 1. Director can download attachments of all reports.
    // 2. Department head CAN ONLY download attachments belonging to their own department.
    if (user.role === 'DEPARTMENT_HEAD' && report.department_id !== user.department_id) {
      const now = new Date().toISOString();
      await executeRun(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          'UNAUTHORIZED_ATTACHMENT_ACCESS_ATTEMPT',
          `محاولة غير مصرح بها من رئيس مصلحة (dept_id: ${user.department_id}) لتحميل المرفق #${attachmentId} من التقرير #${reportId} التابع لمصلحة #${report.department_id}`,
          req.ip || '127.0.0.1',
          now
        ]
      ).catch(() => {});

      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: غير مصرح لك بتحميل مرفقات مصلحة أخرى'
      });
    }

    // Verify file exists on server disk
    if (!fs.existsSync(att.storage_path)) {
      return res.status(404).json({ success: false, error: 'الملف الفعلي غير متوفر في الخادم' });
    }

    // Log successful download
    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'ATTACHMENT_DOWNLOADED',
        `تحميل المرفق "${att.original_filename}" من التقرير رقم #${reportId}`,
        req.ip || '127.0.0.1',
        now
      ]
    ).catch(() => {});

    // Set secure download headers with encoded filename
    res.setHeader('Content-Type', att.mime_type || 'application/octet-stream');
    res.download(att.storage_path, att.original_filename);
  } catch (error: any) {
    console.error('Download attachment error:', error);
    res.status(500).json({ success: false, error: 'فشل تحميل الملف' });
  }
});

// ==========================================
// 6. Phase 3: Director Directives System API
// ==========================================

// GET /api/directives - List directives with strict departmental isolation
router.get('/directives', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { department_id, target_type, status, priority, search } = req.query;

    let sql: string;
    const params: any[] = [];

    if (user.role === 'SUPER_ADMIN') {
      sql = `
        SELECT d.*,
               dept.name as target_dept_name,
               dept.code as target_dept_code,
               dir.name as directorate_name,
               dir.code as directorate_code,
               u.full_name as creator_name,
               u.email as creator_email
        FROM director_directives d
        LEFT JOIN departments dept ON d.target_department_id = dept.id
        LEFT JOIN directorates dir ON d.directorate_id = dir.id
        JOIN users u ON d.created_by = u.id
        WHERE 1=1
      `;
      if (req.query.directorate_id) {
        sql += ` AND d.directorate_id = ?`;
        params.push(parseInt(req.query.directorate_id as string, 10));
      }
      if (department_id) {
        sql += ` AND d.target_department_id = ?`;
        params.push(parseInt(department_id as string, 10));
      }
      if (target_type) {
        sql += ` AND d.target_type = ?`;
        params.push(target_type);
      }
      if (status) {
        sql += ` AND d.status = ?`;
        params.push(status);
      }
    } else if (user.role === 'DIRECTOR') {
      // Director: Can view all directives in their directorate ONLY
      sql = `
        SELECT d.*,
               dept.name as target_dept_name,
               dept.code as target_dept_code,
               dir.name as directorate_name,
               dir.code as directorate_code,
               u.full_name as creator_name,
               u.email as creator_email
        FROM director_directives d
        LEFT JOIN departments dept ON d.target_department_id = dept.id
        LEFT JOIN directorates dir ON d.directorate_id = dir.id
        JOIN users u ON d.created_by = u.id
        WHERE d.directorate_id = ?
      `;
      params.push(user.directorate_id);

      if (department_id) {
        sql += ` AND d.target_department_id = ?`;
        params.push(parseInt(department_id as string, 10));
      }
      if (target_type) {
        sql += ` AND d.target_type = ?`;
        params.push(target_type);
      }
      if (status) {
        sql += ` AND d.status = ?`;
        params.push(status);
      }
    } else {
      // STRICT SECURITY ENFORCEMENT:
      // Department Head can ONLY view directives targeted to their department OR to 'ALL' within their directorate.
      sql = `
        SELECT d.id,
               d.directorate_id,
               d.title,
               d.content,
               d.target_type,
               d.target_department_id,
               d.created_by,
               d.priority,
               COALESCE(dds.status, d.status) as status,
               d.due_date,
               COALESCE(dds.acknowledged_at, d.acknowledged_at) as acknowledged_at,
               COALESCE(dds.started_at, d.started_at) as started_at,
               COALESCE(dds.completed_at, d.completed_at) as completed_at,
               COALESCE(dds.returned_at, d.returned_at) as returned_at,
               COALESCE(dds.return_notes, d.return_notes) as return_notes,
               d.created_at,
               d.updated_at,
               dept.name as target_dept_name,
               dept.code as target_dept_code,
               dir.name as directorate_name,
               u.full_name as creator_name,
               u.email as creator_email
        FROM director_directives d
        LEFT JOIN departments dept ON d.target_department_id = dept.id
        LEFT JOIN directorates dir ON d.directorate_id = dir.id
        JOIN users u ON d.created_by = u.id
        LEFT JOIN directive_department_status dds ON (dds.directive_id = d.id AND dds.department_id = ?)
        WHERE d.directorate_id = ? AND (d.target_type = 'ALL' OR d.target_department_id = ?)
      `;
      params.push(user.department_id, user.directorate_id, user.department_id);

      if (status) {
        sql += ` AND COALESCE(dds.status, d.status) = ?`;
        params.push(status);
      }
    }

    if (priority) {
      sql += ` AND d.priority = ?`;
      params.push(priority);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      sql += ` AND (d.title LIKE ? OR d.content LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    sql += ` ORDER BY d.created_at DESC`;

    const directives = await executeQuery<DirectiveRow>(sql, params);

    res.json({
      success: true,
      data: directives
    });
  } catch (error: any) {
    console.error('Fetch directives error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع التوجيهات الإدارية' });
  }
});

// GET /api/directives/stats - Aggregated stats for dashboards
router.get('/directives/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let allDirectives: { status: string; priority: string }[] = [];

    if (user.role === 'DEPARTMENT_HEAD') {
      allDirectives = await executeQuery<{ status: string; priority: string }>(
        `SELECT COALESCE(dds.status, d.status) as status, d.priority 
         FROM director_directives d
         LEFT JOIN directive_department_status dds ON (dds.directive_id = d.id AND dds.department_id = ?)
         WHERE (d.target_type = 'ALL' OR d.target_department_id = ?)`,
        [user.department_id, user.department_id]
      );
    } else {
      allDirectives = await executeQuery<{ status: string; priority: string }>(
        `SELECT status, priority FROM director_directives`
      );
    }

    const stats = {
      total: allDirectives.length,
      new_count: allDirectives.filter(d => d.status === 'NEW').length,
      acknowledged: allDirectives.filter(d => d.status === 'ACKNOWLEDGED').length,
      in_progress: allDirectives.filter(d => d.status === 'IN_PROGRESS').length,
      completed: allDirectives.filter(d => d.status === 'COMPLETED').length,
      returned: allDirectives.filter(d => d.status === 'RETURNED').length,
      urgent: allDirectives.filter(d => d.priority === 'URGENT').length,
    };

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Directives stats error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع إحصائيات التوجيهات' });
  }
});

// GET /api/directives/:id - Single directive with strict RBAC enforcement
router.get('/directives/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directiveId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    const directives = await executeQuery<DirectiveRow & any>(
      `SELECT d.*,
              dept.name as target_dept_name,
              dept.code as target_dept_code,
              u.full_name as creator_name,
              u.email as creator_email
       FROM director_directives d
       LEFT JOIN departments dept ON d.target_department_id = dept.id
       JOIN users u ON d.created_by = u.id
       WHERE d.id = ?`,
      [directiveId]
    );

    if (directives.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const directive = directives[0];

    // STRICT ACCESS CONTROL:
    // If the caller is a Department Head, they CANNOT view directives targeted to another department.
    if (user.role === 'DEPARTMENT_HEAD') {
      const isAllowed = directive.target_type === 'ALL' || directive.target_department_id === user.department_id;
      if (!isAllowed) {
        const now = new Date().toISOString();
        await executeRun(
          `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
          [
            user.id,
            'UNAUTHORIZED_DIRECTIVE_ACCESS_ATTEMPT',
            `محاولة غير مصرح بها من رئيس مصلحة (dept_id: ${user.department_id}) للوصول إلى التوجيه رقم #${directiveId} الخاص بمصلحة #${directive.target_department_id}`,
            req.ip || '127.0.0.1',
            now
          ]
        ).catch(() => {});

        return res.status(403).json({
          success: false,
          error: 'محظور أمنياً: غير مصرح لك بالاطلاع على توجيه خاص بمصلحة أخرى'
        });
      }

      // Department Head: Fetch their department's independent status record
      const myStatusRows = await executeQuery<DirectiveDepartmentStatusRow>(
        `SELECT dds.*,
                dept.name as dept_name,
                dept.code as dept_code,
                u_ack.full_name as acknowledged_by_name,
                u_start.full_name as started_by_name,
                u_comp.full_name as completed_by_name,
                u_ret.full_name as returned_by_name
         FROM directive_department_status dds
         JOIN departments dept ON dds.department_id = dept.id
         LEFT JOIN users u_ack ON dds.acknowledged_by = u_ack.id
         LEFT JOIN users u_start ON dds.started_by = u_start.id
         LEFT JOIN users u_comp ON dds.completed_by = u_comp.id
         LEFT JOIN users u_ret ON dds.returned_by = u_ret.id
         WHERE dds.directive_id = ? AND dds.department_id = ?`,
        [directiveId, user.department_id]
      );

      if (myStatusRows.length > 0) {
        const ms = myStatusRows[0];
        directive.my_status = ms;
        directive.status = ms.status;
        directive.acknowledged_at = ms.acknowledged_at;
        directive.started_at = ms.started_at;
        directive.completed_at = ms.completed_at;
        directive.returned_at = ms.returned_at;
        directive.return_notes = ms.return_notes;
      }
    } else if (user.role === 'DIRECTOR') {
      // Director: If target_type === 'ALL' or requested, attach all departments' status & summary
      const deptStatusRows = await executeQuery<DirectiveDepartmentStatusRow>(
        `SELECT dds.*,
                dept.name as dept_name,
                dept.code as dept_code,
                dept.icon as dept_icon,
                u_ack.full_name as acknowledged_by_name,
                u_start.full_name as started_by_name,
                u_comp.full_name as completed_by_name,
                u_ret.full_name as returned_by_name
         FROM directive_department_status dds
         JOIN departments dept ON dds.department_id = dept.id
         LEFT JOIN users u_ack ON dds.acknowledged_by = u_ack.id
         LEFT JOIN users u_start ON dds.started_by = u_start.id
         LEFT JOIN users u_comp ON dds.completed_by = u_comp.id
         LEFT JOIN users u_ret ON dds.returned_by = u_ret.id
         WHERE dds.directive_id = ?
         ORDER BY dept.id ASC`,
        [directiveId]
      );

      directive.departments_status = deptStatusRows;
      directive.departments_summary = {
        total: deptStatusRows.length,
        new_count: deptStatusRows.filter(d => d.status === 'NEW').length,
        acknowledged: deptStatusRows.filter(d => d.status === 'ACKNOWLEDGED').length,
        in_progress: deptStatusRows.filter(d => d.status === 'IN_PROGRESS').length,
        completed: deptStatusRows.filter(d => d.status === 'COMPLETED').length,
        returned: deptStatusRows.filter(d => d.status === 'RETURNED').length,
      };
    }

    res.json({
      success: true,
      data: directive
    });
  } catch (error: any) {
    console.error('Directive detail error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع تفاصيل التوجيه' });
  }
});

// GET /api/directives/:id/departments-status - Director ONLY tracking of all departments
router.get('/directives/:id/departments-status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const directiveId = parseInt(req.params.id, 10);

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    // Accessible by DIRECTOR or SUPER_ADMIN
    if (user.role !== 'DIRECTOR' && user.role !== 'SUPER_ADMIN') {
      const now = new Date().toISOString();
      await executeRun(
        `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.directorate_id || null,
          user.id,
          'UNAUTHORIZED_DIRECTIVE_ACCESS_ATTEMPT',
          `محاولة غير مصرح بها من رئيس مصلحة (dept_id: ${user.department_id}) للوصول إلى متابعة المصالح للتوجيه رقم #${directiveId}`,
          req.ip || '127.0.0.1',
          now
        ]
      ).catch(() => {});

      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: متابعة المصالح مخصصة للإدارة العامة حصراً'
      });
    }

    let directiveCheck: DirectiveRow[];
    if (user.role === 'DIRECTOR') {
      directiveCheck = await executeQuery<DirectiveRow>(
        `SELECT id, target_type, target_department_id FROM director_directives WHERE id = ? AND directorate_id = ?`,
        [directiveId, user.directorate_id]
      );
    } else {
      directiveCheck = await executeQuery<DirectiveRow>(
        `SELECT id, target_type, target_department_id FROM director_directives WHERE id = ?`,
        [directiveId]
      );
    }

    if (directiveCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const departments = await executeQuery<DirectiveDepartmentStatusRow>(
      `SELECT dds.*,
              dept.name as dept_name,
              dept.code as dept_code,
              dept.icon as dept_icon,
              u_ack.full_name as acknowledged_by_name,
              u_start.full_name as started_by_name,
              u_comp.full_name as completed_by_name,
              u_ret.full_name as returned_by_name
       FROM directive_department_status dds
       JOIN departments dept ON dds.department_id = dept.id
       LEFT JOIN users u_ack ON dds.acknowledged_by = u_ack.id
       LEFT JOIN users u_start ON dds.started_by = u_start.id
       LEFT JOIN users u_comp ON dds.completed_by = u_comp.id
       LEFT JOIN users u_ret ON dds.returned_by = u_ret.id
       WHERE dds.directive_id = ?
       ORDER BY dept.id ASC`,
      [directiveId]
    );

    const summary = {
      total: departments.length,
      new_count: departments.filter(d => d.status === 'NEW').length,
      acknowledged: departments.filter(d => d.status === 'ACKNOWLEDGED').length,
      in_progress: departments.filter(d => d.status === 'IN_PROGRESS').length,
      completed: departments.filter(d => d.status === 'COMPLETED').length,
      returned: departments.filter(d => d.status === 'RETURNED').length,
    };

    res.json({
      success: true,
      summary,
      departments
    });
  } catch (error: any) {
    console.error('Fetch departments status error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع متابعة المصالح' });
  }
});

// GET /api/directives/:id/my-status - Department Head ONLY tracking of own department
router.get('/directives/:id/my-status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const directiveId = parseInt(req.params.id, 10);

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    if (user.role !== 'DEPARTMENT_HEAD') {
      return res.status(403).json({ success: false, error: 'هذا المسار مخصص لرؤساء المصالح' });
    }

    const directiveCheck = await executeQuery<DirectiveRow>(
      `SELECT id, target_type, target_department_id FROM director_directives WHERE id = ?`,
      [directiveId]
    );

    if (directiveCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const dir = directiveCheck[0];
    const isAllowed = dir.target_type === 'ALL' || dir.target_department_id === user.department_id;
    if (!isAllowed) {
      const now = new Date().toISOString();
      await executeRun(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          'UNAUTHORIZED_DIRECTIVE_ACCESS_ATTEMPT',
          `محاولة غير مصرح بها من رئيس مصلحة (dept_id: ${user.department_id}) للوصول إلى حالة التوجيه رقم #${directiveId}`,
          req.ip || '127.0.0.1',
          now
        ]
      ).catch(() => {});

      return res.status(403).json({
        success: false,
        error: 'محظور أمنياً: غير مصرح لك بالاطلاع على توجيه خاص بمصلحة أخرى'
      });
    }

    const myStatus = await executeQuery<DirectiveDepartmentStatusRow>(
      `SELECT dds.*,
              dept.name as dept_name,
              dept.code as dept_code,
              u_ack.full_name as acknowledged_by_name,
              u_start.full_name as started_by_name,
              u_comp.full_name as completed_by_name,
              u_ret.full_name as returned_by_name
       FROM directive_department_status dds
       JOIN departments dept ON dds.department_id = dept.id
       LEFT JOIN users u_ack ON dds.acknowledged_by = u_ack.id
       LEFT JOIN users u_start ON dds.started_by = u_start.id
       LEFT JOIN users u_comp ON dds.completed_by = u_comp.id
       LEFT JOIN users u_ret ON dds.returned_by = u_ret.id
       WHERE dds.directive_id = ? AND dds.department_id = ?`,
      [directiveId, user.department_id]
    );

    res.json({
      success: true,
      data: myStatus[0] || null
    });
  } catch (error: any) {
    console.error('Fetch my status error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع حالة المصلحة للتوجيه' });
  }
});

// POST /api/directives - Create new directive (Director only)
router.post('/directives', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== 'DIRECTOR') {
      return res.status(403).json({
        success: false,
        error: 'صلاحية غير كافية: إصدار التوجيهات الإدارية مخصص لمدير الإقامة الجامعية حصراً'
      });
    }

    const { title, content, target_type, target_department_id, priority, due_date } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال عنوان واضح ومناسب للتوجيه الإداري' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة نص وتفاصيل التوجيه' });
    }

    if (!target_type || !['DEPARTMENT', 'ALL'].includes(target_type)) {
      return res.status(400).json({ success: false, error: 'نوع الجهة المستهدفة غير صحيح (DEPARTMENT أو ALL)' });
    }

    let targetDeptId: number | null = null;
    if (target_type === 'DEPARTMENT') {
      targetDeptId = parseInt(target_department_id, 10);
      if (isNaN(targetDeptId)) {
        return res.status(400).json({ success: false, error: 'يرجى تحديد المصلحة المستهدفة بالتوجيه' });
      }
      const depts = await executeQuery(`SELECT id FROM departments WHERE id = ? AND directorate_id = ?`, [targetDeptId, user.directorate_id]);
      if (depts.length === 0) {
        return res.status(400).json({ success: false, error: 'المصلحة المحددة غير موجودة أو لا تنتمي لهذه المديرية' });
      }
    }

    const finalPriority = ['NORMAL', 'HIGH', 'URGENT'].includes(priority) ? priority : 'NORMAL';
    const now = new Date().toISOString();

    const newId = await executeInsert(
      `INSERT INTO director_directives (
        directorate_id, title, content, target_type, target_department_id, created_by,
        priority, status, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?)`,
      [
        user.directorate_id,
        title.trim(),
        content.trim(),
        target_type,
        targetDeptId,
        user.id,
        finalPriority,
        due_date || null,
        now,
        now
      ]
    );

    // Automatically create directive_department_status records for departments in THIS DIRECTORATE ONLY
    if (target_type === 'ALL') {
      const allDepts = await executeQuery<{ id: number }>(`SELECT id FROM departments WHERE directorate_id = ? ORDER BY id`, [user.directorate_id]);
      for (const d of allDepts) {
        await executeRun(
          `INSERT INTO directive_department_status (
            directive_id, department_id, status, created_at, updated_at
          ) VALUES (?, ?, 'NEW', ?, ?)`,
          [newId, d.id, now, now]
        );
      }
    } else if (targetDeptId) {
      await executeRun(
        `INSERT INTO directive_department_status (
          directive_id, department_id, status, created_at, updated_at
        ) VALUES (?, ?, 'NEW', ?, ?)`,
        [newId, targetDeptId, now, now]
      );
    }

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.directorate_id,
        user.id,
        'DIRECTIVE_CREATED',
        `إصدار توجيه إداري جديد بعنوان: "${title.trim()}" (رقم #${newId}) إلى ${target_type === 'ALL' ? 'جميع المصالح' : `المصلحة #${targetDeptId}`}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.status(201).json({
      success: true,
      message: 'تم إصدار التوجيه الإداري بنجاح',
      directiveId: newId
    });
  } catch (error: any) {
    console.error('Create directive error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء إصدار التوجيه' });
  }
});

// PUT /api/directives/:id - Edit directive (Director only)
router.put('/directives/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directiveId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    if (user.role !== 'DIRECTOR') {
      return res.status(403).json({ success: false, error: 'تعديل التوجيهات مخصص للمدير فقط' });
    }

    const existing = await executeQuery<DirectiveRow>(`SELECT * FROM director_directives WHERE id = ?`, [directiveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const directive = existing[0];
    if (directive.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن تعديل توجيه تم تنفيذه بالكامل ومؤرشف'
      });
    }

    const { title, content, target_type, target_department_id, priority, due_date } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال عنوان واضح للتوجيه' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة نص التوجيه' });
    }

    let finalTargetType = target_type || directive.target_type;
    let finalDeptId = directive.target_department_id;
    if (finalTargetType === 'ALL') {
      finalDeptId = null;
    } else if (target_department_id !== undefined) {
      finalDeptId = parseInt(target_department_id, 10) || directive.target_department_id;
    }

    const finalPriority = ['NORMAL', 'HIGH', 'URGENT'].includes(priority) ? priority : directive.priority;
    const now = new Date().toISOString();

    await executeRun(
      `UPDATE director_directives SET
        title = ?,
        content = ?,
        target_type = ?,
        target_department_id = ?,
        priority = ?,
        due_date = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        title.trim(),
        content.trim(),
        finalTargetType,
        finalDeptId,
        finalPriority,
        due_date !== undefined ? (due_date || null) : directive.due_date,
        now,
        directiveId
      ]
    );

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'DIRECTIVE_UPDATED',
        `تعديل التوجيه الإداري رقم #${directiveId}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم تحديث التوجيه الإداري بنجاح'
    });
  } catch (error: any) {
    console.error('Update directive error:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث التوجيه' });
  }
});

// DELETE /api/directives/:id - Delete directive (Director only, only if NEW or RETURNED)
router.delete('/directives/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directiveId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    if (user.role !== 'DIRECTOR') {
      return res.status(403).json({ success: false, error: 'حذف التوجيهات مخصص للمدير فقط' });
    }

    const existing = await executeQuery<DirectiveRow>(`SELECT * FROM director_directives WHERE id = ?`, [directiveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const directive = existing[0];
    if (!['NEW', 'RETURNED'].includes(directive.status)) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف توجيه قيد التنفيذ أو تم إنجازه'
      });
    }

    await executeRun(`DELETE FROM director_directives WHERE id = ?`, [directiveId]);

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'DIRECTIVE_DELETED',
        `حذف التوجيه الإداري رقم #${directiveId}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم حذف التوجيه بنجاح'
    });
  } catch (error: any) {
    console.error('Delete directive error:', error);
    res.status(500).json({ success: false, error: 'فشل حذف التوجيه' });
  }
});

// POST /api/directives/:id/acknowledge - "تم الاطلاع" (Department Head only)
router.post('/directives/:id/acknowledge', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directiveId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    if (user.role !== 'DEPARTMENT_HEAD') {
      return res.status(403).json({ success: false, error: 'تأكيد الاطلاع مخصص لرؤساء المصالح المعنيين' });
    }

    const existing = await executeQuery<DirectiveRow>(`SELECT * FROM director_directives WHERE id = ?`, [directiveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const directive = existing[0];

    // Strict access check
    const isAllowed = directive.target_type === 'ALL' || directive.target_department_id === user.department_id;
    if (!isAllowed) {
      const now = new Date().toISOString();
      await executeRun(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          'UNAUTHORIZED_DIRECTIVE_ACCESS_ATTEMPT',
          `محاولة غير مصرح بها لتأكيد الاطلاع على التوجيه رقم #${directiveId} الخاص بمصلحة أخرى`,
          req.ip || '127.0.0.1',
          now
        ]
      ).catch(() => {});

      return res.status(403).json({ success: false, error: 'محظور أمنياً: غير مصرح لك بتأكيد الاطلاع على توجيه خاص بمصلحة أخرى' });
    }

    const now = new Date().toISOString();

    // Fetch or ensure record in directive_department_status for user.department_id
    let deptStatus = await executeQuery<DirectiveDepartmentStatusRow>(
      `SELECT * FROM directive_department_status WHERE directive_id = ? AND department_id = ?`,
      [directiveId, user.department_id]
    );

    if (deptStatus.length === 0) {
      await executeRun(
        `INSERT INTO directive_department_status (directive_id, department_id, status, created_at, updated_at) VALUES (?, ?, 'NEW', ?, ?)`,
        [directiveId, user.department_id, now, now]
      );
      deptStatus = [{ id: 0, directive_id: directiveId, department_id: user.department_id!, status: 'NEW', created_at: now, updated_at: now }];
    }

    // State transition rule: ONLY from NEW
    if (deptStatus[0].status !== 'NEW') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن تأكيد الاطلاع إلا للتوجيهات الجديدة (NEW)'
      });
    }

    await executeRun(
      `UPDATE directive_department_status SET
        status = 'ACKNOWLEDGED',
        acknowledged_by = ?,
        acknowledged_at = ?,
        updated_at = ?
       WHERE directive_id = ? AND department_id = ?`,
      [user.id, now, now, directiveId, user.department_id]
    );

    if (directive.target_type === 'DEPARTMENT') {
      await executeRun(
        `UPDATE director_directives SET
          status = 'ACKNOWLEDGED',
          acknowledged_at = ?,
          updated_at = ?
         WHERE id = ?`,
        [now, now, directiveId]
      );
    }

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'DIRECTIVE_ACKNOWLEDGED',
        `تأكيد الاطلاع على التوجيه رقم #${directiveId} لمصلحة #${user.department_id} من قبل ${user.full_name}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم تأكيد الاطلاع على التوجيه بنجاح'
    });
  } catch (error: any) {
    console.error('Acknowledge directive error:', error);
    res.status(500).json({ success: false, error: 'فشل تأكيد الاطلاع على التوجيه' });
  }
});

// POST /api/directives/:id/start - "بدء التنفيذ" (Department Head only)
router.post('/directives/:id/start', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directiveId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    if (user.role !== 'DEPARTMENT_HEAD') {
      return res.status(403).json({ success: false, error: 'بدء التنفيذ مخصص لرؤساء المصالح المعنيين' });
    }

    const existing = await executeQuery<DirectiveRow>(`SELECT * FROM director_directives WHERE id = ?`, [directiveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const directive = existing[0];

    // Strict access check
    const isAllowed = directive.target_type === 'ALL' || directive.target_department_id === user.department_id;
    if (!isAllowed) {
      const now = new Date().toISOString();
      await executeRun(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          'UNAUTHORIZED_DIRECTIVE_ACCESS_ATTEMPT',
          `محاولة غير مصرح بها لبدء تنفيذ التوجيه رقم #${directiveId} الخاص بمصلحة أخرى`,
          req.ip || '127.0.0.1',
          now
        ]
      ).catch(() => {});

      return res.status(403).json({ success: false, error: 'محظور أمنياً: غير مصرح لك ببدء تنفيذ توجيه خاص بمصلحة أخرى' });
    }

    const now = new Date().toISOString();

    let deptStatus = await executeQuery<DirectiveDepartmentStatusRow>(
      `SELECT * FROM directive_department_status WHERE directive_id = ? AND department_id = ?`,
      [directiveId, user.department_id]
    );

    if (deptStatus.length === 0) {
      await executeRun(
        `INSERT INTO directive_department_status (directive_id, department_id, status, created_at, updated_at) VALUES (?, ?, 'NEW', ?, ?)`,
        [directiveId, user.department_id, now, now]
      );
      deptStatus = [{ id: 0, directive_id: directiveId, department_id: user.department_id!, status: 'NEW', created_at: now, updated_at: now }];
    }

    const currentStatus = deptStatus[0].status;

    // State transition rule: Allowed from ACKNOWLEDGED or RETURNED
    if (currentStatus === 'NEW') {
      return res.status(400).json({
        success: false,
        error: 'يجب تأكيد الاطلاع على التوجيه أولاً قبل بدء التنفيذ'
      });
    }

    if (currentStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'هذا التوجيه تم تنفيذه بالكامل مسبقاً لمصلحتكم'
      });
    }

    if (currentStatus === 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: 'التوجيه قيد التنفيذ حالياً'
      });
    }

    await executeRun(
      `UPDATE directive_department_status SET
        status = 'IN_PROGRESS',
        started_by = ?,
        started_at = COALESCE(started_at, ?),
        updated_at = ?
       WHERE directive_id = ? AND department_id = ?`,
      [user.id, now, now, directiveId, user.department_id]
    );

    if (directive.target_type === 'DEPARTMENT') {
      await executeRun(
        `UPDATE director_directives SET
          status = 'IN_PROGRESS',
          started_at = COALESCE(started_at, ?),
          updated_at = ?
         WHERE id = ?`,
        [now, now, directiveId]
      );
    }

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'DIRECTIVE_STARTED',
        `بدء تنفيذ التوجيه رقم #${directiveId} لمصلحة #${user.department_id} من قبل ${user.full_name}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم تسجيل بدء تنفيذ التوجيه الإداري'
    });
  } catch (error: any) {
    console.error('Start directive error:', error);
    res.status(500).json({ success: false, error: 'فشل تسجيل بدء تنفيذ التوجيه' });
  }
});

// POST /api/directives/:id/complete - "تم التنفيذ" (Department Head only)
router.post('/directives/:id/complete', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directiveId = parseInt(req.params.id, 10);
    const user = req.user!;

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    if (user.role !== 'DEPARTMENT_HEAD') {
      return res.status(403).json({ success: false, error: 'تأكيد إتمام التنفيذ مخصص لرؤساء المصالح' });
    }

    const existing = await executeQuery<DirectiveRow>(`SELECT * FROM director_directives WHERE id = ?`, [directiveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const directive = existing[0];

    // Strict access check
    const isAllowed = directive.target_type === 'ALL' || directive.target_department_id === user.department_id;
    if (!isAllowed) {
      const now = new Date().toISOString();
      await executeRun(
        `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          'UNAUTHORIZED_DIRECTIVE_ACCESS_ATTEMPT',
          `محاولة غير مصرح بها لتأكيد إتمام التوجيه رقم #${directiveId} الخاص بمصلحة أخرى`,
          req.ip || '127.0.0.1',
          now
        ]
      ).catch(() => {});

      return res.status(403).json({ success: false, error: 'محظور أمنياً: غير مصرح لك بإتمام توجيه خاص بمصلحة أخرى' });
    }

    const now = new Date().toISOString();

    let deptStatus = await executeQuery<DirectiveDepartmentStatusRow>(
      `SELECT * FROM directive_department_status WHERE directive_id = ? AND department_id = ?`,
      [directiveId, user.department_id]
    );

    if (deptStatus.length === 0) {
      await executeRun(
        `INSERT INTO directive_department_status (directive_id, department_id, status, created_at, updated_at) VALUES (?, ?, 'NEW', ?, ?)`,
        [directiveId, user.department_id, now, now]
      );
      deptStatus = [{ id: 0, directive_id: directiveId, department_id: user.department_id!, status: 'NEW', created_at: now, updated_at: now }];
    }

    // STRICT TRANSITION: ONLY from IN_PROGRESS -> COMPLETED
    if (deptStatus[0].status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن إتمام التوجيه مباشرة دون المرور بمرحلة بدء التنفيذ (IN_PROGRESS)'
      });
    }

    await executeRun(
      `UPDATE directive_department_status SET
        status = 'COMPLETED',
        completed_by = ?,
        completed_at = ?,
        updated_at = ?
       WHERE directive_id = ? AND department_id = ?`,
      [user.id, now, now, directiveId, user.department_id]
    );

    if (directive.target_type === 'DEPARTMENT') {
      await executeRun(
        `UPDATE director_directives SET
          status = 'COMPLETED',
          completed_at = ?,
          updated_at = ?
         WHERE id = ?`,
        [now, now, directiveId]
      );
    }

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'DIRECTIVE_COMPLETED',
        `تأكيد إتمام تنفيذ التوجيه رقم #${directiveId} لمصلحة #${user.department_id} بنجاح من قبل ${user.full_name}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تم تأكيد إنجاز وتنفيذ التوجيه الإداري بنجاح'
    });
  } catch (error: any) {
    console.error('Complete directive error:', error);
    res.status(500).json({ success: false, error: 'فشل تأكيد إتمام التوجيه' });
  }
});

// POST /api/directives/:id/return - "إعادة التوجيه للتصحيح" (Director only)
router.post('/directives/:id/return', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const directiveId = parseInt(req.params.id, 10);
    const user = req.user!;
    const { return_notes, department_id } = req.body;

    if (isNaN(directiveId)) {
      return res.status(400).json({ success: false, error: 'معرف التوجيه غير صحيح' });
    }

    if (user.role !== 'DIRECTOR') {
      return res.status(403).json({
        success: false,
        error: 'صلاحية غير كافية: إعادة التوجيه للتصحيح من صلاحية مدير الإقامة الجامعية حصراً'
      });
    }

    if (!return_notes || typeof return_notes !== 'string' || return_notes.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'يرجى كتابة ملاحظات وتوجيهات التصحيح (حقل إلزامي)'
      });
    }

    const existing = await executeQuery<DirectiveRow>(`SELECT * FROM director_directives WHERE id = ?`, [directiveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'التوجيه غير موجود' });
    }

    const directive = existing[0];
    const now = new Date().toISOString();
    const targetDept = department_id ? parseInt(department_id, 10) : (directive.target_department_id || null);

    if (targetDept) {
      await executeRun(
        `UPDATE directive_department_status SET
          status = 'RETURNED',
          returned_by = ?,
          return_notes = ?,
          returned_at = ?,
          updated_at = ?
         WHERE directive_id = ? AND department_id = ?`,
        [user.id, return_notes.trim(), now, now, directiveId, targetDept]
      );
    } else {
      await executeRun(
        `UPDATE directive_department_status SET
          status = 'RETURNED',
          returned_by = ?,
          return_notes = ?,
          returned_at = ?,
          updated_at = ?
         WHERE directive_id = ?`,
        [user.id, return_notes.trim(), now, now, directiveId]
      );
    }

    await executeRun(
      `UPDATE director_directives SET
        status = 'RETURNED',
        return_notes = ?,
        returned_at = ?,
        updated_at = ?
       WHERE id = ?`,
      [return_notes.trim(), now, now, directiveId]
    );

    await executeRun(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        user.id,
        'DIRECTIVE_RETURNED',
        `إعادة التوجيه رقم #${directiveId} لمصلحة #${targetDept || 'ALL'} للتصحيح مع الملاحظات: "${return_notes.trim()}"`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    res.json({
      success: true,
      message: 'تمت إعادة التوجيه للتصحيح بنجاح'
    });
  } catch (error: any) {
    console.error('Return directive error:', error);
    res.status(500).json({ success: false, error: 'فشل إعادة التوجيه للتصحيح' });
  }
});

// ========================================================
// 7. Phase 3.5: Multi-Tenant SaaS Platform Administration (SUPER_ADMIN)
// ========================================================

// --- Directorates Management ---
router.get('/admin/directorates', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await executeQuery<DirectorateRow>(
      `SELECT dir.*,
              (SELECT s.status FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_status,
              (SELECT s.start_date FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_start_date,
              (SELECT s.end_date FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_end_date,
              (SELECT s.plan_name FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_plan,
              (SELECT s.id FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_id,
              (SELECT COUNT(*) FROM departments d WHERE d.directorate_id = dir.id) as departments_count,
              (SELECT COUNT(*) FROM users u WHERE u.directorate_id = dir.id) as users_count,
              (SELECT u.full_name FROM users u WHERE u.directorate_id = dir.id AND u.role = 'DIRECTOR' AND u.is_active = 1 LIMIT 1) as director_name,
              (SELECT u.username FROM users u WHERE u.directorate_id = dir.id AND u.role = 'DIRECTOR' AND u.is_active = 1 LIMIT 1) as director_username,
              (SELECT u.email FROM users u WHERE u.directorate_id = dir.id AND u.role = 'DIRECTOR' AND u.is_active = 1 LIMIT 1) as director_email
       FROM directorates dir
       ORDER BY dir.id ASC`
    );
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('Fetch directorates error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع قائمة المديريات' });
  }
});

// GET single directorate detail with its departments, director, heads and subscription
router.get('/admin/directorates/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dirId = parseInt(req.params.id, 10);
    if (isNaN(dirId)) {
      return res.status(400).json({ success: false, error: 'معرف المديرية غير صحيح' });
    }

    const dirRows = await executeQuery<DirectorateRow>(
      `SELECT dir.*,
              (SELECT s.status FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_status,
              (SELECT s.start_date FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_start_date,
              (SELECT s.end_date FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_end_date,
              (SELECT s.plan_name FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_plan,
              (SELECT s.id FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_id,
              (SELECT u.full_name FROM users u WHERE u.directorate_id = dir.id AND u.role = 'DIRECTOR' AND u.is_active = 1 LIMIT 1) as director_name
       FROM directorates dir
       WHERE dir.id = ?`,
      [dirId]
    );

    if (dirRows.length === 0) {
      return res.status(404).json({ success: false, error: 'المديرية غير موجودة' });
    }
    const directorate = dirRows[0];

    // Current subscription
    const subRows = await executeQuery<SubscriptionRow>(
      `SELECT s.*, dir.name as directorate_name, dir.code as directorate_code
       FROM subscriptions s
       JOIN directorates dir ON s.directorate_id = dir.id
       WHERE s.directorate_id = ?
       ORDER BY s.id DESC LIMIT 1`,
      [dirId]
    );
    const subscription = subRows[0] || null;

    // Departments belonging ONLY to this directorate
    const departments = await executeQuery<DepartmentRow>(
      `SELECT d.*,
              u.full_name as head_name,
              u.username as head_username,
              u.email as head_email,
              u.phone as head_phone,
              u.id as head_id,
              u.is_active as head_is_active
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'DEPARTMENT_HEAD'
       WHERE d.directorate_id = ?
       ORDER BY d.id ASC`,
      [dirId]
    );

    // Current director (if any)
    const directorRows = await executeQuery<UserRow>(
      `SELECT id, username, email, full_name, role, phone, is_active, last_login, created_at, directorate_id
       FROM users
       WHERE directorate_id = ? AND role = 'DIRECTOR'
       ORDER BY is_active DESC, id DESC LIMIT 1`,
      [dirId]
    );
    const director = directorRows[0] || null;

    // Department heads in this directorate
    const departmentHeads = await executeQuery<UserRow & { department_name?: string; department_code?: string }>(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.phone, u.is_active, u.last_login, u.created_at,
              u.department_id, u.directorate_id,
              d.name as department_name, d.code as department_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.directorate_id = ? AND u.role = 'DEPARTMENT_HEAD'
       ORDER BY u.id ASC`,
      [dirId]
    );

    res.json({
      success: true,
      data: {
        directorate,
        subscription,
        departments,
        director,
        departmentHeads,
        stats: {
          departments_count: departments.length,
          users_count: (director ? 1 : 0) + departmentHeads.length,
          heads_count: departmentHeads.length,
          has_active_director: !!director && director.is_active === 1
        }
      }
    });
  } catch (error: any) {
    console.error('Fetch directorate detail error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع تفاصيل المديرية' });
  }
});

router.post('/admin/directorates', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, description, plan_name, subscription_end_date } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال اسم رسمي واضح للمديرية' });
    }
    if (!code || typeof code !== 'string' || code.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رمز تعريفي فريد للمديرية' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await executeQuery(`SELECT id FROM directorates WHERE UPPER(code) = ?`, [cleanCode]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'الرمز التعريفي للمديرية مستخدم بالفعل' });
    }

    const now = new Date().toISOString();
    const newDirId = await executeInsert(
      `INSERT INTO directorates (name, code, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)`,
      [name.trim(), cleanCode, description?.trim() || null, now, now]
    );

    // Create initial subscription for the newly created directorate
    const today = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = subscription_end_date && typeof subscription_end_date === 'string' && subscription_end_date.length >= 10
      ? subscription_end_date
      : oneYearLater;

    await executeRun(
      `INSERT INTO subscriptions (directorate_id, status, plan_name, start_date, end_date, notes, created_at, updated_at)
       VALUES (?, 'ACTIVE', ?, ?, ?, 'اشتراك مفعل تلقائياً للمديرية', ?, ?)`,
      [newDirId, plan_name || 'PRO_ENTERPRISE', today, endDate, now, now]
    );

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [newDirId, req.user!.id, 'DIRECTORATE_CREATED', `إنشاء مديرية جديدة: "${name.trim()}" (${cleanCode})`, req.ip || '127.0.0.1', now]
    );

    res.status(201).json({ success: true, message: 'تم إنشاء المديرية وتفعيل اشتراكها بنجاح', directorateId: newDirId });
  } catch (error: any) {
    console.error('Create directorate error:', error);
    res.status(500).json({ success: false, error: 'فشل إنشاء المديرية' });
  }
});

router.put('/admin/directorates/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dirId = parseInt(req.params.id, 10);
    const { name, code, description, is_active } = req.body;
    if (isNaN(dirId)) {
      return res.status(400).json({ success: false, error: 'معرف المديرية غير صحيح' });
    }

    const existing = await executeQuery<DirectorateRow>(`SELECT * FROM directorates WHERE id = ?`, [dirId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المديرية غير موجودة' });
    }

    if (code && typeof code === 'string') {
      const cleanCode = code.trim().toUpperCase();
      const dup = await executeQuery(`SELECT id FROM directorates WHERE UPPER(code) = ? AND id != ?`, [cleanCode, dirId]);
      if (dup.length > 0) {
        return res.status(400).json({ success: false, error: 'الرمز التعريفي للمديرية مستخدم مسبقاً' });
      }
    }

    const now = new Date().toISOString();
    const cur = existing[0];
    await executeRun(
      `UPDATE directorates SET
         name = COALESCE(?, name),
         code = COALESCE(?, code),
         description = COALESCE(?, description),
         is_active = COALESCE(?, is_active),
         updated_at = ?
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        code ? code.trim().toUpperCase() : null,
        description !== undefined ? (description?.trim() || null) : cur.description,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        now,
        dirId
      ]
    );

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [dirId, req.user!.id, 'DIRECTORATE_UPDATED', `تعديل بيانات المديرية #${dirId}`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: 'تم تحديث بيانات المديرية بنجاح' });
  } catch (error: any) {
    console.error('Update directorate error:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث بيانات المديرية' });
  }
});

router.post('/admin/directorates/:id/toggle-status', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dirId = parseInt(req.params.id, 10);
    const existing = await executeQuery<DirectorateRow>(`SELECT * FROM directorates WHERE id = ?`, [dirId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المديرية غير موجودة' });
    }

    const newStatus = existing[0].is_active === 1 ? 0 : 1;
    const now = new Date().toISOString();
    await executeRun(`UPDATE directorates SET is_active = ?, updated_at = ? WHERE id = ?`, [newStatus, now, dirId]);

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [dirId, req.user!.id, 'DIRECTORATE_STATUS_TOGGLED', `${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المديرية #${dirId}`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: newStatus === 1 ? 'تم تفعيل المديرية بنجاح' : 'تم تعطيل المديرية بنجاح', is_active: newStatus });
  } catch (error: any) {
    console.error('Toggle directorate status error:', error);
    res.status(500).json({ success: false, error: 'فشل تغيير حالة المديرية' });
  }
});

// --- Subscriptions Management ---
router.get('/admin/subscriptions', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await executeQuery<SubscriptionRow>(
      `SELECT s.*, dir.name as directorate_name, dir.code as directorate_code
       FROM subscriptions s
       JOIN directorates dir ON s.directorate_id = dir.id
       ORDER BY s.id DESC`
    );
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('Fetch subscriptions error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع الاشتراكات' });
  }
});

router.post('/admin/subscriptions', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { directorate_id, status, plan_name, start_date, end_date, notes } = req.body;
    const dirId = parseInt(directorate_id, 10);
    if (isNaN(dirId)) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد المديرية المعنية' });
    }
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'تاريخ بداية ونهاية الاشتراك مطلوبان' });
    }

    const validStatus = ['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status) ? status : 'ACTIVE';
    const now = new Date().toISOString();

    const newSubId = await executeInsert(
      `INSERT INTO subscriptions (directorate_id, status, plan_name, start_date, end_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dirId, validStatus, plan_name || 'PRO_ENTERPRISE', start_date, end_date, notes || null, now, now]
    );

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [dirId, req.user!.id, 'SUBSCRIPTION_CREATED', `إنشاء/تجديد اشتراك للمديرية #${dirId} (${validStatus})`, req.ip || '127.0.0.1', now]
    );

    res.status(201).json({ success: true, message: 'تم تسجيل الاشتراك بنجاح', subscriptionId: newSubId });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, error: 'فشل تسجيل الاشتراك' });
  }
});

router.put('/admin/subscriptions/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subId = parseInt(req.params.id, 10);
    const { status, plan_name, start_date, end_date, notes } = req.body;
    if (isNaN(subId)) {
      return res.status(400).json({ success: false, error: 'معرف الاشتراك غير صحيح' });
    }

    const existing = await executeQuery<SubscriptionRow>(`SELECT * FROM subscriptions WHERE id = ?`, [subId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'الاشتراك غير موجود' });
    }

    const now = new Date().toISOString();
    const cur = existing[0];
    await executeRun(
      `UPDATE subscriptions SET
         status = COALESCE(?, status),
         plan_name = COALESCE(?, plan_name),
         start_date = COALESCE(?, start_date),
         end_date = COALESCE(?, end_date),
         notes = COALESCE(?, notes),
         updated_at = ?
       WHERE id = ?`,
      [status || null, plan_name || null, start_date || null, end_date || null, notes !== undefined ? notes : cur.notes, now, subId]
    );

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [cur.directorate_id, req.user!.id, 'SUBSCRIPTION_UPDATED', `تعديل الاشتراك #${subId}`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: 'تم تحديث بيانات الاشتراك بنجاح' });
  } catch (error: any) {
    console.error('Update subscription error:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث بيانات الاشتراك' });
  }
});

// Update subscription directly by Directorate ID
router.put('/admin/directorates/:id/subscription', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dirId = parseInt(req.params.id, 10);
    if (isNaN(dirId)) {
      return res.status(400).json({ success: false, error: 'معرف المديرية غير صحيح' });
    }

    const dirCheck = await executeQuery<DirectorateRow>(`SELECT * FROM directorates WHERE id = ?`, [dirId]);
    if (dirCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'المديرية غير موجودة' });
    }

    const { status, plan_name, start_date, end_date, notes } = req.body;
    const validStatus = ['ACTIVE', 'EXPIRED', 'SUSPENDED'].includes(status) ? status : 'ACTIVE';
    const now = new Date().toISOString();

    const existingSub = await executeQuery<SubscriptionRow>(
      `SELECT * FROM subscriptions WHERE directorate_id = ? ORDER BY id DESC LIMIT 1`,
      [dirId]
    );

    if (existingSub.length > 0) {
      const cur = existingSub[0];
      await executeRun(
        `UPDATE subscriptions SET
           status = COALESCE(?, status),
           plan_name = COALESCE(?, plan_name),
           start_date = COALESCE(?, start_date),
           end_date = COALESCE(?, end_date),
           notes = COALESCE(?, notes),
           updated_at = ?
         WHERE id = ?`,
        [validStatus, plan_name || cur.plan_name, start_date || cur.start_date, end_date || cur.end_date, notes !== undefined ? notes : cur.notes, now, cur.id]
      );
    } else {
      const today = start_date || new Date().toISOString().split('T')[0];
      const nextYear = end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await executeInsert(
        `INSERT INTO subscriptions (directorate_id, status, plan_name, start_date, end_date, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [dirId, validStatus, plan_name || 'PRO_ENTERPRISE', today, nextYear, notes || null, now, now]
      );
    }

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [dirId, req.user!.id, 'SUBSCRIPTION_UPDATED', `تحديث اشتراك المديرية #${dirId} (${validStatus})`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: 'تم حفظ وتحديث اشتراك المديرية بنجاح' });
  } catch (error: any) {
    console.error('Update directorate subscription error:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث اشتراك المديرية' });
  }
});

// Renew subscription directly by Directorate ID
router.post('/admin/directorates/:id/subscription/renew', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dirId = parseInt(req.params.id, 10);
    if (isNaN(dirId)) {
      return res.status(400).json({ success: false, error: 'معرف المديرية غير صحيح' });
    }

    const dirCheck = await executeQuery<DirectorateRow>(`SELECT * FROM directorates WHERE id = ?`, [dirId]);
    if (dirCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'المديرية غير موجودة' });
    }

    const { start_date, end_date, plan_name, notes } = req.body;
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    const defaultStart = start_date || today;
    const defaultEnd = end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newSubId = await executeInsert(
      `INSERT INTO subscriptions (directorate_id, status, plan_name, start_date, end_date, notes, created_at, updated_at)
       VALUES (?, 'ACTIVE', ?, ?, ?, ?, ?, ?)`,
      [
        dirId,
        plan_name || 'PRO_ENTERPRISE',
        defaultStart,
        defaultEnd,
        notes || `تجديد سنوي معتمد من المشرف العام بتاريخ ${today}`,
        now,
        now
      ]
    );

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [dirId, req.user!.id, 'SUBSCRIPTION_RENEWED', `تجديد اشتراك المديرية #${dirId} حتى ${defaultEnd}`, req.ip || '127.0.0.1', now]
    );

    res.status(201).json({ success: true, message: 'تم تجديد اشتراك المديرية بنجاح', subscriptionId: newSubId });
  } catch (error: any) {
    console.error('Renew subscription error:', error);
    res.status(500).json({ success: false, error: 'فشل تجديد اشتراك المديرية' });
  }
});

// --- Departments Management (SUPER_ADMIN only) ---
router.post('/admin/departments', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { directorate_id, code, name, description, icon } = req.body;
    const dirId = parseInt(directorate_id, 10);
    if (isNaN(dirId)) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد المديرية التابعة لها المصلحة' });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة اسم صحيح للمصلحة' });
    }
    if (!code || typeof code !== 'string' || code.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رمز تعريفي للمصلحة' });
    }

    const dirCheck = await executeQuery(`SELECT id FROM directorates WHERE id = ?`, [dirId]);
    if (dirCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'المديرية المحددة غير موجودة' });
    }

    const cleanCode = code.trim().toLowerCase();
    const dup = await executeQuery(`SELECT id FROM departments WHERE LOWER(code) = ? AND directorate_id = ?`, [cleanCode, dirId]);
    if (dup.length > 0) {
      return res.status(400).json({ success: false, error: 'رمز المصلحة مستخدم مسبقاً داخل هذه المديرية' });
    }

    const now = new Date().toISOString();
    const newDeptId = await executeInsert(
      `INSERT INTO departments (code, name, description, icon, directorate_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [cleanCode, name.trim(), description?.trim() || '', icon || 'Building2', dirId, now]
    );

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [dirId, req.user!.id, 'DEPARTMENT_CREATED', `إنشاء مصلحة جديدة: "${name.trim()}" (${cleanCode}) بالمديرية #${dirId}`, req.ip || '127.0.0.1', now]
    );

    res.status(201).json({ success: true, message: 'تم إنشاء المصلحة بنجاح', departmentId: newDeptId });
  } catch (error: any) {
    console.error('Create department error:', error);
    res.status(500).json({ success: false, error: 'فشل إنشاء المصلحة' });
  }
});

router.put('/admin/departments/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deptId = parseInt(req.params.id, 10);
    const { name, code, description, icon, is_active } = req.body;
    if (isNaN(deptId)) {
      return res.status(400).json({ success: false, error: 'معرف المصلحة غير صحيح' });
    }

    const existing = await executeQuery<DepartmentRow>(`SELECT * FROM departments WHERE id = ?`, [deptId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المصلحة غير موجودة' });
    }

    const cur = existing[0];
    if (code && typeof code === 'string') {
      const cleanCode = code.trim().toLowerCase();
      const dup = await executeQuery(`SELECT id FROM departments WHERE LOWER(code) = ? AND directorate_id = ? AND id != ?`, [cleanCode, cur.directorate_id, deptId]);
      if (dup.length > 0) {
        return res.status(400).json({ success: false, error: 'رمز المصلحة مستخدم مسبقاً داخل هذه المديرية' });
      }
    }

    await executeRun(
      `UPDATE departments SET
         name = COALESCE(?, name),
         code = COALESCE(?, code),
         description = COALESCE(?, description),
         icon = COALESCE(?, icon),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        code ? code.trim().toLowerCase() : null,
        description !== undefined ? description?.trim() : cur.description,
        icon || null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        deptId
      ]
    );

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [cur.directorate_id, req.user!.id, 'DEPARTMENT_UPDATED', `تعديل بيانات المصلحة #${deptId}`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: 'تم تحديث بيانات المصلحة بنجاح' });
  } catch (error: any) {
    console.error('Update department error:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث بيانات المصلحة' });
  }
});

router.post('/admin/departments/:id/toggle-status', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deptId = parseInt(req.params.id, 10);
    const existing = await executeQuery<DepartmentRow>(`SELECT * FROM departments WHERE id = ?`, [deptId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المصلحة غير موجودة' });
    }

    const cur = existing[0];
    const newStatus = (cur.is_active === 0) ? 1 : 0;
    await executeRun(`UPDATE departments SET is_active = ? WHERE id = ?`, [newStatus, deptId]);

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [cur.directorate_id, req.user!.id, 'DEPARTMENT_STATUS_TOGGLED', `${newStatus === 1 ? 'تفعيل' : 'تعطيل'} المصلحة #${deptId} (${cur.name})`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: newStatus === 1 ? 'تم تفعيل المصلحة بنجاح' : 'تم تعطيل المصلحة بنجاح', is_active: newStatus });
  } catch (error: any) {
    console.error('Toggle department status error:', error);
    res.status(500).json({ success: false, error: 'فشل تغيير حالة المصلحة' });
  }
});

router.delete('/admin/departments/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deptId = parseInt(req.params.id, 10);
    const existing = await executeQuery<DepartmentRow>(`SELECT * FROM departments WHERE id = ?`, [deptId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المصلحة غير موجودة' });
    }

    const cur = existing[0];
    const usersCountRes = await executeQuery<{ count: number }>(`SELECT COUNT(*) as count FROM users WHERE department_id = ?`, [deptId]);
    if ((usersCountRes[0]?.count || 0) > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف المصلحة لوجود مستخدمين معينين عليها' });
    }

    const reportsCountRes = await executeQuery<{ count: number }>(`SELECT COUNT(*) as count FROM reports WHERE department_id = ?`, [deptId]);
    if ((reportsCountRes[0]?.count || 0) > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف المصلحة لوجود تقارير إدارية سابقة مرتبطة بها' });
    }

    await executeRun(`DELETE FROM departments WHERE id = ?`, [deptId]);

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [cur.directorate_id, req.user!.id, 'DEPARTMENT_DELETED', `حذف المصلحة #${deptId} (${cur.name})`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: 'تم حذف المصلحة بنجاح' });
  } catch (error: any) {
    console.error('Delete department error:', error);
    res.status(500).json({ success: false, error: 'فشل حذف المصلحة' });
  }
});

// --- Users Management (SUPER_ADMIN only) ---
router.post('/admin/users', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, email, password, confirm_password, full_name, role, directorate_id, department_id, phone, is_active } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ success: false, error: 'يرجى استكمال الحقول الإلزامية (الاسم، اسم المستخدم، كلمة المرور، الدور)' });
    }

    if (confirm_password !== undefined && confirm_password !== password) {
      return res.status(400).json({ success: false, error: 'كلمة المرور وتأكيد كلمة المرور غير متطابقين' });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف' });
    }

    if (!['DIRECTOR', 'DEPARTMENT_HEAD'].includes(role)) {
      return res.status(400).json({ success: false, error: 'الدور المحدد يجب أن يكون DIRECTOR أو DEPARTMENT_HEAD' });
    }

    const dirId = parseInt(directorate_id, 10);
    if (isNaN(dirId)) {
      return res.status(400).json({ success: false, error: 'يرجى ربط المستخدم بمديرية صحيحة' });
    }

    const dirCheck = await executeQuery(`SELECT id FROM directorates WHERE id = ?`, [dirId]);
    if (dirCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'المديرية المحددة غير موجودة' });
    }

    const initialStatus = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    // REQUIREMENT 4: Prevent having more than one active DIRECTOR per directorate
    if (role === 'DIRECTOR' && initialStatus === 1) {
      const existingDirector = await executeQuery<{ id: number; full_name: string }>(
        `SELECT id, full_name FROM users WHERE directorate_id = ? AND role = 'DIRECTOR' AND is_active = 1`,
        [dirId]
      );
      if (existingDirector.length > 0) {
        return res.status(400).json({
          success: false,
          error: `يوجد بالفعل مدير مفعّل لهذه المديرية (${existingDirector[0].full_name}). لا يمكن تعيين أكثر من مدير فعّال لنفس المديرية.`
        });
      }
    }

    // REQUIREMENT 5: Strict validation that department belongs to this directorate
    let assignedDeptId: number | null = null;
    if (role === 'DEPARTMENT_HEAD') {
      if (!department_id) {
        return res.status(400).json({ success: false, error: 'رئيس المصلحة يجب ربطه بمصلحة تابعة لهذه المديرية' });
      }
      assignedDeptId = parseInt(department_id, 10);
      const deptCheck = await executeQuery(`SELECT id FROM departments WHERE id = ? AND directorate_id = ?`, [assignedDeptId, dirId]);
      if (deptCheck.length === 0) {
        return res.status(400).json({ success: false, error: 'المصلحة المحددة لا تنتمي إلى هذه المديرية' });
      }
    }

    // Auto-generate placeholder email if optional email is left empty
    const sanitizedEmail = email && email.trim() ? email.trim() : `${username.trim()}@dou.dz`;

    const userDup = await executeQuery(`SELECT id FROM users WHERE username = ? OR email = ?`, [username.trim(), sanitizedEmail]);
    if (userDup.length > 0) {
      return res.status(400).json({ success: false, error: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password.trim(), salt);
    const now = new Date().toISOString();

    const newUserId = await executeInsert(
      `INSERT INTO users (username, email, password_hash, full_name, role, directorate_id, department_id, phone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username.trim(), sanitizedEmail, passwordHash, full_name.trim(), role, dirId, assignedDeptId, phone?.trim() || null, initialStatus, now]
    );

    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [dirId, req.user!.id, 'USER_CREATED', `إنشاء حساب ${role === 'DIRECTOR' ? 'مدير' : 'رئيس مصلحة'}: "${full_name.trim()}" (${username.trim()}) بالمديرية #${dirId}`, req.ip || '127.0.0.1', now]
    );

    res.status(201).json({ success: true, message: 'تم إنشاء حساب المستخدم بنجاح', userId: newUserId });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'فشل إنشاء حساب المستخدم' });
  }
});

router.put('/admin/users/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const existing = await executeQuery<UserRow>(`SELECT * FROM users WHERE id = ?`, [targetUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    const cur = existing[0];
    const { full_name, email, phone, role, directorate_id, department_id, password, is_active } = req.body;

    if (email && email.trim() !== cur.email) {
      const dup = await executeQuery(`SELECT id FROM users WHERE email = ? AND id != ?`, [email.trim(), targetUserId]);
      if (dup.length > 0) {
        return res.status(400).json({ success: false, error: 'البريد الإلكتروني مسجل لمستخدم آخر' });
      }
    }

    let newDirId = cur.directorate_id;
    if (directorate_id !== undefined) {
      newDirId = directorate_id ? parseInt(directorate_id, 10) : null;
    }

    let newDeptId = cur.department_id;
    const finalRole = role || cur.role;
    if (finalRole === 'DIRECTOR') {
      newDeptId = null;
      const willBeActive = is_active !== undefined ? (is_active ? 1 : 0) : cur.is_active;
      if (willBeActive === 1) {
        const existingDirector = await executeQuery<{ id: number; full_name: string }>(
          `SELECT id, full_name FROM users WHERE directorate_id = ? AND role = 'DIRECTOR' AND is_active = 1 AND id != ?`,
          [newDirId, targetUserId]
        );
        if (existingDirector.length > 0) {
          return res.status(400).json({
            success: false,
            error: `يوجد بالفعل مدير مفعّل لهذه المديرية (${existingDirector[0].full_name}). لا يمكن تعيين أكثر من مدير فعّال لنفس المديرية.`
          });
        }
      }
    } else if (finalRole === 'DEPARTMENT_HEAD') {
      if (department_id !== undefined) {
        newDeptId = department_id ? parseInt(department_id, 10) : null;
      }
      if (!newDeptId) {
        return res.status(400).json({ success: false, error: 'رئيس المصلحة يجب ربطه بمصلحة محددة تابعة لهذه المديرية' });
      }
      if (newDeptId && newDirId) {
        const deptCheck = await executeQuery(`SELECT id FROM departments WHERE id = ? AND directorate_id = ?`, [newDeptId, newDirId]);
        if (deptCheck.length === 0) {
          return res.status(400).json({ success: false, error: 'المصلحة المحددة لا تنتمي للمديرية المعينة' });
        }
      }
    }

    let newPassHash = cur.password_hash;
    if (password && typeof password === 'string' && password.trim().length >= 6) {
      if (req.body.confirm_password !== undefined && req.body.confirm_password !== password) {
        return res.status(400).json({ success: false, error: 'كلمة المرور وتأكيد كلمة المرور غير متطابقين' });
      }
      const salt = bcrypt.genSaltSync(10);
      newPassHash = bcrypt.hashSync(password.trim(), salt);
    }

    await executeRun(
      `UPDATE users SET
         full_name = COALESCE(?, full_name),
         email = COALESCE(?, email),
         phone = COALESCE(?, phone),
         role = COALESCE(?, role),
         directorate_id = ?,
         department_id = ?,
         password_hash = ?,
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        full_name ? full_name.trim() : null,
        email ? email.trim() : null,
        phone !== undefined ? (phone?.trim() || null) : cur.phone,
        role || null,
        newDirId,
        newDeptId,
        newPassHash,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        targetUserId
      ]
    );

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [newDirId, req.user!.id, 'USER_UPDATED', `تعديل بيانات المستخدم #${targetUserId}`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح' });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'فشل تحديث بيانات المستخدم' });
  }
});

router.post('/admin/users/:id/toggle-status', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const existing = await executeQuery<UserRow>(`SELECT * FROM users WHERE id = ?`, [targetUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    if (existing[0].role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, error: 'لا يمكن تعطيل حساب المشرف العام' });
    }

    const newStatus = existing[0].is_active === 1 ? 0 : 1;
    if (existing[0].role === 'DIRECTOR' && newStatus === 1) {
      const activeDir = await executeQuery<{ id: number; full_name: string }>(
        `SELECT id, full_name FROM users WHERE directorate_id = ? AND role = 'DIRECTOR' AND is_active = 1 AND id != ?`,
        [existing[0].directorate_id, targetUserId]
      );
      if (activeDir.length > 0) {
        return res.status(400).json({
          success: false,
          error: `يوجد بالفعل مدير مفعّل لهذه المديرية (${activeDir[0].full_name}). لا يمكن تفعيل أكثر من مدير في نفس الوقت.`
        });
      }
    }
    await executeRun(`UPDATE users SET is_active = ? WHERE id = ?`, [newStatus, targetUserId]);

    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [existing[0].directorate_id, req.user!.id, 'USER_STATUS_TOGGLED', `${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المستخدم #${targetUserId}`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: newStatus === 1 ? 'تم تفعيل الحساب بنجاح' : 'تم تعطيل الحساب بنجاح', is_active: newStatus });
  } catch (error: any) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, error: 'فشل تغيير حالة المستخدم' });
  }
});

router.delete('/admin/users/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const existing = await executeQuery<UserRow>(`SELECT * FROM users WHERE id = ?`, [targetUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }
    if (existing[0].role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف حساب المشرف العام' });
    }

    const reportsCount = await executeQuery<{ count: number }>(`SELECT COUNT(*) as count FROM reports WHERE author_id = ?`, [targetUserId]);
    if ((reportsCount[0]?.count || 0) > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف هذا المستخدم لوجود تقارير إدارية سابقة حررها. يمكنك تعطيل الحساب بدلاً من الحذف.' });
    }

    const dirCount = await executeQuery<{ count: number }>(`SELECT COUNT(*) as count FROM director_directives WHERE created_by = ?`, [targetUserId]);
    if ((dirCount[0]?.count || 0) > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف هذا المستخدم لوجود توجيهات إدارية منشأة بواسطته. يمكنك تعطيل الحساب بدلاً من الحذف.' });
    }

    await executeRun(`DELETE FROM users WHERE id = ?`, [targetUserId]);
    const now = new Date().toISOString();
    await executeRun(
      `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [existing[0].directorate_id, req.user!.id, 'USER_DELETED', `حذف المستخدم #${targetUserId} (${existing[0].full_name})`, req.ip || '127.0.0.1', now]
    );

    res.json({ success: true, message: 'تم حذف حساب المستخدم بنجاح' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'فشل حذف المستخدم' });
  }
});

// --- Audit & Activity Logs ---
router.get('/admin/activity-logs', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { directorate_id, limit } = req.query;
    let sql = `
      SELECT a.*,
             u.full_name as user_full_name,
             u.username as user_username,
             u.role as user_role,
             dir.name as directorate_name,
             dir.code as directorate_code
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN directorates dir ON a.directorate_id = dir.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (directorate_id) {
      sql += ` AND a.directorate_id = ?`;
      params.push(parseInt(directorate_id as string, 10));
    }
    sql += ` ORDER BY a.id DESC LIMIT ?`;
    params.push(limit ? parseInt(limit as string, 10) : 50);

    const logs = await executeQuery(sql, params);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Fetch activity logs error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع سجل النشاطات' });
  }
});

// --- Public Endpoints for Login & Multi-Tenant Discovery ---

// GET /api/public/directorates - Dynamically returns all active directorates for login showcase
router.get('/public/directorates', async (req: Request, res: Response) => {
  try {
    const list = await executeQuery<DirectorateRow>(
      `SELECT dir.id, dir.name, dir.code, dir.description, dir.is_active,
              (SELECT s.status FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_status,
              (SELECT s.end_date FROM subscriptions s WHERE s.directorate_id = dir.id ORDER BY s.id DESC LIMIT 1) as subscription_end_date,
              (SELECT COUNT(*) FROM departments d WHERE d.directorate_id = dir.id AND d.is_active = 1) as departments_count,
              (SELECT COUNT(*) FROM users u WHERE u.directorate_id = dir.id AND u.is_active = 1) as users_count,
              (SELECT u.full_name FROM users u WHERE u.directorate_id = dir.id AND u.role = 'DIRECTOR' AND u.is_active = 1 LIMIT 1) as director_name,
              (SELECT u.username FROM users u WHERE u.directorate_id = dir.id AND u.role = 'DIRECTOR' AND u.is_active = 1 LIMIT 1) as director_username,
              (SELECT u.email FROM users u WHERE u.directorate_id = dir.id AND u.role = 'DIRECTOR' AND u.is_active = 1 LIMIT 1) as director_email
       FROM directorates dir
       WHERE dir.is_active = 1
       ORDER BY dir.id ASC`
    );
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('Fetch public directorates error:', error);
    res.status(500).json({ success: false, error: 'فشل استرجاع قائمة المديريات النشطة' });
  }
});

export default router;
