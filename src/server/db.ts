import initSqlJs, { Database, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface DirectorateRow {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  subscription_status?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  subscription_end_date?: string;
  departments_count?: number;
  users_count?: number;
  director_name?: string | null;
  director_username?: string | null;
  director_email?: string | null;
}

export interface SubscriptionRow {
  id: number;
  directorate_id: number;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  plan_name: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  directorate_name?: string;
  directorate_code?: string;
}

export interface DepartmentRow {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  directorate_id: number;
  is_active?: number;
  created_at: string;
  directorate_name?: string;
  directorate_code?: string;
  head_name?: string;
  head_username?: string;
  head_email?: string;
  head_phone?: string;
  head_id?: number;
}

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'DIRECTOR' | 'DEPARTMENT_HEAD';
  directorate_id: number | null;
  department_id: number | null;
  phone: string | null;
  is_active: number;
  created_at: string;
  last_login: string | null;
  directorate_name?: string;
  directorate_code?: string;
}

export interface ReportRow {
  id: number;
  directorate_id?: number;
  department_id: number;
  created_by: number;
  report_type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  title: string;
  report_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  content: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'REVIEWED';
  revision_notes?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  dept_name?: string;
  dept_code?: string;
  author_name?: string;
  author_email?: string;
  directorate_name?: string;
}

export interface AttachmentRow {
  id: number;
  report_id: number;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: number;
  created_at: string;
  uploader_name?: string;
}

export interface DirectiveRow {
  id: number;
  directorate_id?: number;
  title: string;
  content: string;
  target_type: 'DEPARTMENT' | 'ALL';
  target_department_id: number | null;
  created_by: number;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'RETURNED';
  due_date?: string | null;
  acknowledged_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  returned_at?: string | null;
  return_notes?: string | null;
  created_at: string;
  updated_at: string;
  target_dept_name?: string;
  target_dept_code?: string;
  creator_name?: string;
  creator_email?: string;
  directorate_name?: string;
}

export interface DirectiveDepartmentStatusRow {
  id: number;
  directive_id: number;
  department_id: number;
  status: 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'RETURNED';
  acknowledged_by?: number | null;
  acknowledged_at?: string | null;
  acknowledged_by_name?: string | null;
  started_by?: number | null;
  started_at?: string | null;
  started_by_name?: string | null;
  completed_by?: number | null;
  completed_at?: string | null;
  completed_by_name?: string | null;
  returned_by?: number | null;
  returned_at?: string | null;
  returned_by_name?: string | null;
  return_notes?: string | null;
  created_at: string;
  updated_at: string;
  dept_name?: string;
  dept_code?: string;
  dept_icon?: string;
}

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

function saveToDisk(db: Database) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing database, creating fresh:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchemaAndSeed(dbInstance);
  saveToDisk(dbInstance);

  return dbInstance;
}

function initSchemaAndSeed(db: Database) {
  // Helper for adding columns safely
  const ensureColumn = (tableName: string, columnName: string, colDef: string) => {
    try {
      const tableInfo = db.exec(`PRAGMA table_info(${tableName});`);
      const cols = tableInfo[0]?.values?.map(v => v[1]) || [];
      if (!cols.includes(columnName)) {
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${colDef};`);
      }
    } catch (err) {
      console.warn(`Column check notice for ${tableName}.${columnName}:`, err);
    }
  };

  // 1. Directorates table (Multi-Tenant SaaS Foundation - Phase 3.5)
  db.run(`
    CREATE TABLE IF NOT EXISTS directorates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Subscriptions table (Monthly/Annual SaaS Subscription - Phase 3.5)
  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      directorate_id INTEGER NOT NULL REFERENCES directorates(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED')),
      plan_name TEXT DEFAULT 'STANDARD',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Departments table (Belongs to a directorate)
  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      directorate_id INTEGER REFERENCES directorates(id),
      created_at TEXT NOT NULL
    );
  `);
  ensureColumn('departments', 'directorate_id', 'INTEGER REFERENCES directorates(id)');
  ensureColumn('departments', 'is_active', 'INTEGER NOT NULL DEFAULT 1');

  // 4. Users table (SUPER_ADMIN, DIRECTOR, DEPARTMENT_HEAD)
  // Check if users table needs migration for SUPER_ADMIN or directorate_id
  try {
    const usersSqlRes = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users';");
    const usersSql = usersSqlRes[0]?.values?.[0]?.[0] as string || '';
    if (!usersSql.includes('SUPER_ADMIN') || !usersSql.includes('directorate_id')) {
      db.run(`
        CREATE TABLE IF NOT EXISTS users_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'DIRECTOR', 'DEPARTMENT_HEAD')),
          directorate_id INTEGER REFERENCES directorates(id),
          department_id INTEGER REFERENCES departments(id),
          phone TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          last_login TEXT
        );
      `);

      const hasDirCol = usersSql.includes('directorate_id');
      if (hasDirCol) {
        db.run(`
          INSERT INTO users_temp (id, username, email, password_hash, full_name, role, directorate_id, department_id, phone, is_active, created_at, last_login)
          SELECT id, username, email, password_hash, full_name, role, directorate_id, department_id, phone, is_active, created_at, last_login FROM users;
        `);
      } else {
        db.run(`
          INSERT INTO users_temp (id, username, email, password_hash, full_name, role, directorate_id, department_id, phone, is_active, created_at, last_login)
          SELECT id, username, email, password_hash, full_name, role, 1, department_id, phone, is_active, created_at, last_login FROM users;
        `);
      }
      db.run("DROP TABLE users;");
      db.run("ALTER TABLE users_temp RENAME TO users;");
    }
  } catch (err) {
    console.warn('Users migration check notice:', err);
  }
  ensureColumn('users', 'directorate_id', 'INTEGER REFERENCES directorates(id)');

  // 5. Reports table (Phase 2 Administrative Reports System)
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      directorate_id INTEGER REFERENCES directorates(id),
      department_id INTEGER NOT NULL REFERENCES departments(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      report_type TEXT NOT NULL CHECK(report_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
      title TEXT NOT NULL,
      report_date TEXT,
      period_start TEXT,
      period_end TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_REVISION', 'REVIEWED')),
      revision_notes TEXT,
      submitted_at TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  ensureColumn('reports', 'directorate_id', 'INTEGER REFERENCES directorates(id)');

  // Migrate existing table columns if needed (e.g. if table existed with old schema from phase 1 stub)
  try {
    const tableInfo = db.exec("PRAGMA table_info(reports);");
    const cols = tableInfo[0]?.values?.map(v => v[1]) || [];
    if (!cols.includes('created_by') && cols.includes('user_id')) {
      // Recreate table cleanly if it has no data
      const countRes = db.exec("SELECT COUNT(*) FROM reports;");
      const count = countRes[0]?.values?.[0]?.[0] || 0;
      if (count === 0) {
        db.run("DROP TABLE reports;");
        db.run(`
          CREATE TABLE reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER NOT NULL REFERENCES departments(id),
            created_by INTEGER NOT NULL REFERENCES users(id),
            report_type TEXT NOT NULL CHECK(report_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
            title TEXT NOT NULL,
            report_date TEXT,
            period_start TEXT,
            period_end TEXT,
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_REVISION', 'REVIEWED')),
            revision_notes TEXT,
            submitted_at TEXT,
            reviewed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);
      }
    }
  } catch (err) {
    console.warn('Reports table schema check:', err);
  }

  // 4. Report Attachments table (Phase 2 Attachments)
  db.run(`
    CREATE TABLE IF NOT EXISTS report_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
  `);

  // 5. Director Directives table (Phase 3 System)
  db.run(`
    CREATE TABLE IF NOT EXISTS director_directives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      directorate_id INTEGER REFERENCES directorates(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('DEPARTMENT', 'ALL')),
      target_department_id INTEGER REFERENCES departments(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL', 'HIGH', 'URGENT')),
      status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED')),
      due_date TEXT,
      acknowledged_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      returned_at TEXT,
      return_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  ensureColumn('director_directives', 'directorate_id', 'INTEGER REFERENCES directorates(id)');

  // 6. Directive Department Status table (Independent tracking per department for ALL & DEPARTMENT directives)
  db.run(`
    CREATE TABLE IF NOT EXISTS directive_department_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      directive_id INTEGER NOT NULL REFERENCES director_directives(id) ON DELETE CASCADE,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'RETURNED')),
      acknowledged_by INTEGER REFERENCES users(id),
      acknowledged_at TEXT,
      started_by INTEGER REFERENCES users(id),
      started_at TEXT,
      completed_by INTEGER REFERENCES users(id),
      completed_at TEXT,
      returned_by INTEGER REFERENCES users(id),
      returned_at TEXT,
      return_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(directive_id, department_id)
    );
  `);

  // 7. Evaluations table (architectural foundation for Phase 2)
  db.run(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      director_id INTEGER NOT NULL REFERENCES users(id),
      department_id INTEGER NOT NULL REFERENCES departments(id),
      period TEXT NOT NULL,
      score INTEGER CHECK(score >= 0 AND score <= 100),
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 8. Activity logs table (for auditing & future activity timeline)
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      directorate_id INTEGER REFERENCES directorates(id),
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);
  ensureColumn('activity_logs', 'directorate_id', 'INTEGER REFERENCES directorates(id)');

  const now = new Date().toISOString();

  // Seed default Directorate 1 and Subscription if empty (Phase 3.5 SaaS)
  try {
    const dirCountResult = db.exec('SELECT COUNT(*) as count FROM directorates');
    const dirCount = dirCountResult[0]?.values[0]?.[0] as number || 0;

    if (dirCount === 0) {
      db.run(
        `INSERT INTO directorates (id, name, code, description, is_active, created_at, updated_at) 
         VALUES (1, 'الإقامة الجامعية المركزية 1', 'DIR-CENTRAL-01', 'المديرية الجامعية المركزية النموذجية للخدمات الطلابية', 1, ?, ?)`,
        [now, now]
      );
      db.run(
        `INSERT INTO subscriptions (directorate_id, status, plan_name, start_date, end_date, notes, created_at, updated_at)
         VALUES (1, 'ACTIVE', 'PRO_ENTERPRISE', '2026-01-01', '2027-12-31', 'اشتراك سنوي مفعل للمديرية المركزية', ?, ?)`,
        [now, now]
      );
    } else {
      const subCountResult = db.exec('SELECT COUNT(*) FROM subscriptions WHERE directorate_id = 1');
      const subCount = subCountResult[0]?.values[0]?.[0] as number || 0;
      if (subCount === 0) {
        db.run(
          `INSERT INTO subscriptions (directorate_id, status, plan_name, start_date, end_date, notes, created_at, updated_at)
           VALUES (1, 'ACTIVE', 'PRO_ENTERPRISE', '2026-01-01', '2027-12-31', 'اشتراك سنوي مفعل للمديرية المركزية', ?, ?)`,
          [now, now]
        );
      }
    }
  } catch (err) {
    console.warn('Directorate & subscription seed notice:', err);
  }

  // Seed SuperAdmin user if missing (Phase 3.5 Global Platform Admin)
  try {
    const saCountResult = db.exec("SELECT COUNT(*) FROM users WHERE role = 'SUPER_ADMIN'");
    const saCount = saCountResult[0]?.values[0]?.[0] as number || 0;

    if (saCount === 0) {
      const saSalt = bcrypt.genSaltSync(10);
      const saHash = bcrypt.hashSync('superadmin12345', saSalt);
      db.run(
        `INSERT INTO users (username, email, password_hash, full_name, role, directorate_id, department_id, phone, is_active, created_at)
         VALUES (?, ?, ?, ?, 'SUPER_ADMIN', NULL, NULL, '+213 21 00 00 00', 1, ?)`,
        [
          'superadmin',
          'superadmin@onou.dz',
          saHash,
          'المشرف العام للمنصة (Super Admin)',
          now
        ]
      );
    }
  } catch (err) {
    console.warn('SuperAdmin user seed notice:', err);
  }

  // Seed Departments if empty
  const deptCountResult = db.exec('SELECT COUNT(*) as count FROM departments');
  const deptCount = deptCountResult[0]?.values[0]?.[0] as number || 0;

  if (deptCount === 0) {
    const defaultDepartments = [
      {
        id: 1,
        code: 'medical',
        name: 'مصلحة الطب',
        description: 'المتابعة الطبية، الفحوصات والعيادة الصحية للطلبة المقيمين وتوفير الإسعافات الأولية وتأطير الحملات الوقائية.',
        icon: 'Stethoscope'
      },
      {
        id: 2,
        code: 'housing',
        name: 'مصلحة الإيواء',
        description: 'تسيير الغرف والأجنحة، تسكين الطلبة، متابعة شغور الأسرة ومراقبة المرافق السكنية وشروط الإقامة الكريمة.',
        icon: 'Building2'
      },
      {
        id: 3,
        code: 'psychology',
        name: 'مصلحة الطب النفسي',
        description: 'الإصغاء والتوجيه النفسي، المرافقة النفسية، الاستشارات المتخصصة ودعم الاستقرار النفسي والاجتماعي للطلبة.',
        icon: 'Brain'
      },
      {
        id: 4,
        code: 'catering',
        name: 'مصلحة الإطعام',
        description: 'تسيير المطعم الجامعي، تحضير وتوزيع الوجبات الغذائية، النظافة الصحية ومراقبة مخازن التموين وجودة الأغذية.',
        icon: 'Utensils'
      },
      {
        id: 5,
        code: 'maintenance',
        name: 'مصلحة الصيانة',
        description: 'صيانة شبكات الكهرباء، التدفئة المركزية، السباكة، معالجة الأعطال الطارئة وأشغال الترميم والتجهيز.',
        icon: 'Wrench'
      },
      {
        id: 6,
        code: 'security',
        name: 'مصلحة الأمن الداخلي',
        description: 'حراسة المداخل وتأمين المحيط الداخلي والخارجي، ضبط حركة الدخول والخروج وحماية ممتلكات الإقامة والطلبة.',
        icon: 'ShieldCheck'
      }
    ];

    for (const d of defaultDepartments) {
      db.run(
        `INSERT INTO departments (id, code, name, description, icon, directorate_id, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [d.id, d.code, d.name, d.description, d.icon, now]
      );
    }
  }

  // Seed Users if empty
  const userCountResult = db.exec("SELECT COUNT(*) as count FROM users WHERE role != 'SUPER_ADMIN'");
  const userCount = userCountResult[0]?.values[0]?.[0] as number || 0;

  if (userCount === 0) {
    // 1. Director
    const directorSalt = bcrypt.genSaltSync(10);
    const directorHash = bcrypt.hashSync('director12345', directorSalt);
    db.run(
      `INSERT INTO users (username, email, password_hash, full_name, role, directorate_id, department_id, phone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        'director',
        'director@residence.dz',
        directorHash,
        'د. أحمد بن علي',
        'DIRECTOR',
        null,
        '0550 12 34 56',
        1,
        now
      ]
    );

    // 2. Department Heads (One for each of the 6 departments)
    const heads = [
      {
        username: 'head_medical',
        email: 'medical@residence.dz',
        password: 'medical12345',
        full_name: 'د. كريم مسعودي',
        department_id: 1,
        phone: '0551 23 45 67'
      },
      {
        username: 'head_housing',
        email: 'housing@residence.dz',
        password: 'housing12345',
        full_name: 'أ. عمار بلقاسم',
        department_id: 2,
        phone: '0552 34 56 78'
      },
      {
        username: 'head_psychology',
        email: 'psychology@residence.dz',
        password: 'psychology12345',
        full_name: 'أ. نادية شريف',
        department_id: 3,
        phone: '0553 45 67 89'
      },
      {
        username: 'head_catering',
        email: 'catering@residence.dz',
        password: 'catering12345',
        full_name: 'أ. رشيد طاهري',
        department_id: 4,
        phone: '0554 56 78 90'
      },
      {
        username: 'head_maintenance',
        email: 'maintenance@residence.dz',
        password: 'maintenance12345',
        full_name: 'م. يوسف العربي',
        department_id: 5,
        phone: '0555 67 89 01'
      },
      {
        username: 'head_security',
        email: 'security@residence.dz',
        password: 'security12345',
        full_name: 'أ. عبد القادر زروقي',
        department_id: 6,
        phone: '0556 78 90 12'
      }
    ];

    for (const h of heads) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(h.password, salt);
      db.run(
        `INSERT INTO users (username, email, password_hash, full_name, role, directorate_id, department_id, phone, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        [
          h.username,
          h.email,
          hash,
          h.full_name,
          'DEPARTMENT_HEAD',
          h.department_id,
          h.phone,
          1,
          now
        ]
      );
    }
  }

  // Safe Migration: Link all existing records to default Directorate 1 if not linked
  try {
    db.run("UPDATE departments SET directorate_id = 1 WHERE directorate_id IS NULL;");
    db.run("UPDATE users SET directorate_id = 1 WHERE role != 'SUPER_ADMIN' AND (directorate_id IS NULL OR directorate_id = 0);");
    db.run("UPDATE reports SET directorate_id = 1 WHERE directorate_id IS NULL;");
    db.run("UPDATE director_directives SET directorate_id = 1 WHERE directorate_id IS NULL;");
    db.run("UPDATE activity_logs SET directorate_id = 1 WHERE directorate_id IS NULL;");
  } catch (err) {
    console.warn('Data migration to directorate 1 notice:', err);
  }

  // =========================================================================
  // Temporary testing password for Medea Director (Medea@2026)
  // NOTE: This password ('Medea@2026') is strictly temporary for testing purposes
  // during the multi-tenant evaluation period. It is hashed securely with bcrypt.
  // We only update the existing user record without creating any duplicate account.
  // This block can be safely removed or superseded once password management is active in Super Admin UI.
  // =========================================================================
  try {
    const medeaUserResult = db.exec("SELECT id, username FROM users WHERE username = 'dir_medea_7797' LIMIT 1;");
    if (medeaUserResult.length > 0 && medeaUserResult[0].values.length > 0) {
      const medeaUserId = medeaUserResult[0].values[0][0];
      const tempSalt = bcrypt.genSaltSync(10);
      const tempHash = bcrypt.hashSync('Medea@2026', tempSalt);
      db.run("UPDATE users SET password_hash = ? WHERE id = ?;", [tempHash, medeaUserId]);
    }
  } catch (err) {
    console.warn('Temporary Medea testing password update notice:', err);
  }

  // Ensure standard departments for Medea exist (Medical, Housing, Psychology, Catering, Maintenance, Security)
  try {
    const medeaDirResult = db.exec("SELECT id FROM directorates WHERE code = 'DIR-MEDEA-01' OR name LIKE '%المدية%' LIMIT 1;");
    if (medeaDirResult.length > 0 && medeaDirResult[0].values.length > 0) {
      const medeaDirId = medeaDirResult[0].values[0][0];
      const standardMedeaDepts = [
        { name: 'مصلحة الطب', code: 'med_medea', icon: 'Stethoscope', desc: 'الرعاية الطبية والوقائية والعيادة المركزية بالمدية' },
        { name: 'مصلحة الإيواء', code: 'housing_medea', icon: 'Building2', desc: 'تسيير الأجنحة والغرف وتسكين الطلبة بالمدية' },
        { name: 'مصلحة الطب النفسي', code: 'psychology_medea', icon: 'Brain', desc: 'الإصغاء والمرافقة النفسية والاستشارات المتخصصة بالمدية' },
        { name: 'مصلحة الإطعام', code: 'catering_medea', icon: 'Utensils', desc: 'تسيير المطعم الجامعي وتحضير وتوزيع الوجبات بالمدية' },
        { name: 'مصلحة الصيانة', code: 'maintenance_medea', icon: 'Wrench', desc: 'أعمال الصيانة العامة والكهرباء والتدفئة بالمدية' },
        { name: 'مصلحة الأمن الداخلي', code: 'security_medea', icon: 'ShieldCheck', desc: 'حراسة المداخل وتأمين محيط الإقامة والطلبة بالمدية' }
      ];
      for (const sd of standardMedeaDepts) {
        const exist = db.exec(`SELECT id FROM departments WHERE directorate_id = ${medeaDirId} AND name = '${sd.name}' LIMIT 1;`);
        if (exist.length === 0 || exist[0].values.length === 0) {
          const nowStr = new Date().toISOString();
          db.run(
            `INSERT INTO departments (code, name, description, icon, directorate_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [sd.code, sd.name, sd.desc, sd.icon, medeaDirId, nowStr]
          );
        }
      }
    }
  } catch (err) {
    console.warn('Standard Medea departments setup notice:', err);
  }

  // Seed sample directives if table is empty (Phase 3 System)
  try {
    const dirCountResult = db.exec('SELECT COUNT(*) as count FROM director_directives');
    const dirCount = dirCountResult[0]?.values[0]?.[0] as number || 0;

    if (dirCount === 0) {
      const now = new Date().toISOString();
      const defaultDirectives = [
        {
          title: 'تعليمات تنظيمية حول تعزيز إجراءات السلامة والنظافة خلال فترة الامتحانات',
          content: 'يطلب من جميع رؤساء المصالح السهر التام على تطبيق معايير السلامة العامة، وتكثيف دوريات المراقبة والنظافة العامة في كافة أرجاء الإقامة لتوفير الجو الملائم للطلبة.',
          target_type: 'ALL',
          target_department_id: null,
          created_by: 1,
          priority: 'HIGH',
          status: 'ACKNOWLEDGED',
          due_date: '2026-10-15',
          acknowledged_at: now
        },
        {
          title: 'مراجعة كشوفات الغرف الشاغرة وضبط الإحصائيات السكنية',
          content: 'إجراء إحصاء دقيق لجميع الغرف بالأجنحة السكنية وإعداد تقرير حول المقيمين الفعليين لضبط الإحصائيات قبل نهاية الأسبوع.',
          target_type: 'DEPARTMENT',
          target_department_id: 2,
          created_by: 1,
          priority: 'URGENT',
          status: 'NEW',
          due_date: '2026-10-10',
          acknowledged_at: null
        },
        {
          title: 'تنظيم حملة وقائية للكشف الطبي وتأمين مخزون الأدوية',
          content: 'يرجى التنسيق مع الهيئات الصحية لبرمجة فحوصات دورية والتأكد من وفرة التجهيزات والأدوية الاستعجالية بالعيادة.',
          target_type: 'DEPARTMENT',
          target_department_id: 1,
          created_by: 1,
          priority: 'NORMAL',
          status: 'IN_PROGRESS',
          due_date: '2026-10-20',
          acknowledged_at: now,
          started_at: now
        }
      ];

      for (const d of defaultDirectives) {
        db.run(
          `INSERT INTO director_directives (
            directorate_id, title, content, target_type, target_department_id, created_by, priority, status,
            due_date, acknowledged_at, started_at, created_at, updated_at
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.title,
            d.content,
            d.target_type,
            d.target_department_id,
            d.created_by,
            d.priority,
            d.status,
            d.due_date,
            d.acknowledged_at,
            (d as any).started_at || null,
            now,
            now
          ]
        );
      }
    }
  } catch (err) {
    console.warn('Directives seed notice:', err);
  }

  // Safe Migration: Populate directive_department_status for existing directives
  try {
    const existingDirectives = db.exec("SELECT id, target_type, target_department_id, status, created_at, updated_at, acknowledged_at, started_at, completed_at, returned_at, return_notes, created_by FROM director_directives;");
    if (existingDirectives.length > 0 && existingDirectives[0].values) {
      const allDeptsRes = db.exec("SELECT id FROM departments ORDER BY id;");
      const allDeptIds = allDeptsRes[0]?.values?.map(v => v[0] as number) || [];

      for (const row of existingDirectives[0].values) {
        const dId = row[0] as number;
        const targetType = row[1] as string;
        const targetDeptId = row[2] as number | null;
        const dStatus = (row[3] as string) || 'NEW';
        const createdAt = (row[4] as string) || new Date().toISOString();
        const updatedAt = (row[5] as string) || createdAt;
        const ackAt = row[6] as string | null;
        const startAt = row[7] as string | null;
        const compAt = row[8] as string | null;
        const retAt = row[9] as string | null;
        const retNotes = row[10] as string | null;
        const createdBy = row[11] as number | null;

        if (targetType === 'ALL') {
          for (const deptId of allDeptIds) {
            db.run(`
              INSERT OR IGNORE INTO directive_department_status (
                directive_id, department_id, status, acknowledged_at, started_at, completed_at, returned_at, return_notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [dId, deptId, dStatus, ackAt, startAt, compAt, retAt, retNotes, createdAt, updatedAt]);
          }
        } else if (targetType === 'DEPARTMENT' && targetDeptId) {
          db.run(`
            INSERT OR IGNORE INTO directive_department_status (
              directive_id, department_id, status, acknowledged_at, started_at, completed_at, returned_at, return_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [dId, targetDeptId, dStatus, ackAt, startAt, compAt, retAt, retNotes, createdAt, updatedAt]);
        }
      }
    }
  } catch (migErr) {
    console.warn('Directive department status migration notice:', migErr);
  }
}

// Helpers for data queries
export async function executeQuery<T = any>(sql: string, params: SqlValue[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export async function executeRun(sql: string, params: SqlValue[] = []): Promise<void> {
  const db = await getDb();
  db.run(sql, params);
  saveToDisk(db);
}

export async function executeInsert(sql: string, params: SqlValue[] = []): Promise<number> {
  const db = await getDb();
  db.run(sql, params);
  const res = db.exec("SELECT last_insert_rowid();");
  const lastId = res[0]?.values?.[0]?.[0] as number;
  saveToDisk(db);
  return lastId || 1;
}
