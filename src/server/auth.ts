import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { executeQuery, executeRun, UserRow, DepartmentRow } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'university_dorm_management_secret_key_2026_secure';

export interface UserSessionPayload {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'DIRECTOR' | 'DEPARTMENT_HEAD';
  directorate_id: number | null;
  directorate_name?: string;
  directorate_code?: string;
  department_id: number | null;
  department_name?: string;
  department_code?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserSessionPayload;
}

export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    roleName: 'المشرف العام للمنصة (Super Admin)',
    permissions: [
      'CAN_MANAGE_DIRECTORATES',
      'CAN_MANAGE_ALL_DEPARTMENTS',
      'CAN_MANAGE_ALL_USERS',
      'CAN_MANAGE_SUBSCRIPTIONS',
      'CAN_VIEW_ALL_DIRECTORATES',
      'CAN_VIEW_GLOBAL_AUDIT_LOGS'
    ],
    scope: 'GLOBAL_SAAS'
  },
  DIRECTOR: {
    roleName: 'مدير الإقامة الجامعية',
    permissions: [
      'CAN_VIEW_ALL_DEPARTMENTS',
      'CAN_VIEW_ALL_USERS',
      'CAN_MANAGE_USERS',
      'CAN_ISSUE_DIRECTIVES',
      'CAN_EVALUATE_DEPARTMENTS',
      'CAN_AUDIT_LOGS',
      'CAN_ACCESS_STATISTICS'
    ],
    scope: 'ALL_DEPARTMENTS'
  },
  DEPARTMENT_HEAD: {
    roleName: 'رئيس مصلحة',
    permissions: [
      'CAN_VIEW_OWN_DEPARTMENT',
      'CAN_VIEW_DEPARTMENT_TEAM',
      'CAN_SUBMIT_DAILY_REPORTS',
      'CAN_SUBMIT_WEEKLY_REPORTS',
      'CAN_SUBMIT_MONTHLY_REPORTS',
      'CAN_RECEIVE_DIRECTIVES',
      'CAN_VIEW_OWN_EVALUATIONS'
    ],
    scope: 'OWN_DEPARTMENT_ONLY'
  }
};

export function generateToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSessionPayload;
  } catch (err) {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'جلسة تسجيل الدخول منتهية الصلاحية أو غير صالحة' });
  }

  req.user = user;
  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'محظور أمنياً: هذه العملية مخصصة للمشرف العام للمنصة (SUPER_ADMIN) حصراً'
    });
  }
  next();
}

export async function loginUser(identifier: string, passwordPlain: string, selectedDirectorateId?: number | string | null) {
  const users = await executeQuery<UserRow & { 
    dept_name?: string; 
    dept_code?: string;
    directorate_name?: string;
    directorate_code?: string;
    directorate_is_active?: number;
  }>(
    `SELECT u.*, 
            d.name as dept_name, d.code as dept_code,
            dir.name as directorate_name, dir.code as directorate_code, dir.is_active as directorate_is_active
     FROM users u 
     LEFT JOIN departments d ON u.department_id = d.id 
     LEFT JOIN directorates dir ON u.directorate_id = dir.id
     WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1`,
    [identifier.trim(), identifier.trim()]
  );

  if (users.length === 0) {
    return { success: false, error: 'اسم المستخدم أو البريد الإلكتروني غير صحيح' };
  }

  const user = users[0];
  const isMatch = bcrypt.compareSync(passwordPlain, user.password_hash);
  if (!isMatch) {
    return { success: false, error: 'كلمة المرور غير صحيحة' };
  }

  // Requirement 8 & 9: Verify selected directorate matches user's assigned directorate
  if (user.role !== 'SUPER_ADMIN') {
    if (selectedDirectorateId && selectedDirectorateId !== 'SUPER_ADMIN' && selectedDirectorateId !== '') {
      const parsedDirId = parseInt(String(selectedDirectorateId), 10);
      if (!isNaN(parsedDirId) && user.directorate_id !== parsedDirId) {
        return { success: false, error: 'هذا الحساب غير مسجل ضمن المديرية المختارة. يرجى اختيار المديرية التابع لها.' };
      }
    }
  }

  // If user belongs to a directorate, check if directorate is active
  if (user.role !== 'SUPER_ADMIN' && user.directorate_id) {
    if (user.directorate_is_active === 0) {
      return { success: false, error: 'تم تعطيل حساب هذه المديرية من قبل إدارة المنصة (SUPER_ADMIN)' };
    }
  }

  // Check subscription details
  let subscription: { status: string; end_date: string; is_expired: boolean } | null = null;
  if (user.directorate_id) {
    const subRes = await executeQuery<{ status: string; end_date: string }>(
      `SELECT status, end_date FROM subscriptions WHERE directorate_id = ? ORDER BY id DESC LIMIT 1`,
      [user.directorate_id]
    );
    if (subRes.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const isExpired = subRes[0].status !== 'ACTIVE' || (subRes[0].end_date < today);
      subscription = {
        status: subRes[0].status,
        end_date: subRes[0].end_date,
        is_expired: isExpired
      };

      if (user.role !== 'SUPER_ADMIN') {
        if (subRes[0].status === 'SUSPENDED') {
          return { success: false, error: 'تم تجميد اشتراك هذه المديرية في المنصة. يرجى مراجعة المشرف العام للمنصة' };
        }
        if (subRes[0].status === 'EXPIRED' || subRes[0].end_date < today) {
          return { success: false, error: 'انتهت صلاحية اشتراك هذه المديرية في المنصة. يرجى التواصل مع المشرف العام لتجديد الترخيص' };
        }
      }
    }
  }

  const now = new Date().toISOString();
  await executeRun(`UPDATE users SET last_login = ? WHERE id = ?`, [now, user.id]);

  // Log activity
  await executeRun(
    `INSERT INTO activity_logs (directorate_id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [user.directorate_id, user.id, 'LOGIN', 'تسجيل دخول ناجح إلى المنصة', '127.0.0.1', now]
  );

  const payload: UserSessionPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    directorate_id: user.directorate_id,
    directorate_name: user.directorate_name,
    directorate_code: user.directorate_code,
    department_id: user.department_id,
    department_name: user.dept_name,
    department_code: user.dept_code
  };

  const token = generateToken(payload);
  const permissionsInfo = ROLE_PERMISSIONS[user.role];

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      roleName: permissionsInfo.roleName,
      directorateId: user.directorate_id,
      directorateName: user.directorate_name,
      directorateCode: user.directorate_code,
      departmentId: user.department_id,
      departmentName: user.dept_name,
      departmentCode: user.dept_code,
      phone: user.phone,
      lastLogin: now,
      permissions: permissionsInfo.permissions,
      scope: permissionsInfo.scope,
      subscription
    }
  };
}
