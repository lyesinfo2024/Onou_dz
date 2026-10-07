// scripts/test_phase3_5_multitenant.js
import http from 'http';

async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('=================================================================');
  console.log('  اختبارات المرحلة 3.5: تحويل المنصة لنظام Multi-Tenant SaaS      ');
  console.log('  التحقق من عزل المديريات وصلاحيات المشرف العام والمديرين        ');
  console.log('=================================================================\n');

  async function request(urlPath, options = {}) {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  async function login(identifier, password) {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    return res.data;
  }

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [نجاح] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [فشل] ${message}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: SUPER_ADMIN Authentication and Full SaaS Management
  // -------------------------------------------------------------
  console.log('1. اختبار تسجيل دخول وصلاحيات المشرف العام (SUPER_ADMIN):');
  const superAuth = await login('superadmin', 'superadmin12345');
  assert(superAuth && superAuth.success && superAuth.user?.role === 'SUPER_ADMIN', 'تسجيل دخول المشرف العام بنجاح');
  const superToken = superAuth.token;

  // 1.1 List directorates
  const dirListRes = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(dirListRes.status === 200 && dirListRes.data.success && dirListRes.data.data.length >= 1, `استرجاع قائمة المديريات (${dirListRes.data?.data?.length} مديرية)`);

  // 1.2 Create a new directorate
  const newDirCode = 'TEST_DIR_' + Date.now();
  const createDirRes = await request('/api/admin/directorates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      name: 'مديرية الإقامة الجامعية - فرع وهران',
      code: newDirCode,
      description: 'مديرية ثانية لاختبار العزل الكامل للمستأجرين Multi-Tenancy',
      plan_name: 'PRO_ENTERPRISE',
      subscription_end_date: '2028-12-31'
    })
  });
  assert(createDirRes.status === 201 && createDirRes.data.success, 'المشرف العام ينشئ مديرية جديدة بنجاح مع اشتراك مفعل');
  const secondDirId = createDirRes.data.directorateId;

  // 1.3 SuperAdmin creates departments for the second directorate
  const uniqueDeptCode = 'med_' + Date.now().toString().slice(-4);
  const createDeptRes = await request('/api/admin/departments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      directorate_id: secondDirId,
      code: uniqueDeptCode,
      name: 'مصلحة الطب - وهران',
      description: 'المصلحة الطبية بالمديرية الثانية',
      icon: 'Stethoscope'
    })
  });
  if (!createDeptRes.data?.success) {
    console.log('    [تفاصيل خطأ المصلحة]:', createDeptRes.status, createDeptRes.data);
  }
  assert(createDeptRes.status === 201 && createDeptRes.data?.success, 'المشرف العام ينشئ مصلحة جديدة تابعة للمديرية الثانية');
  const secondDeptId = createDeptRes.data?.departmentId;

  // 1.4 SuperAdmin creates users for the second directorate
  const createDirectorRes = await request('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      username: `director_oran_${Date.now()}`,
      email: `director_oran_${Date.now()}@residence.dz`,
      password: 'oran12345Password',
      full_name: 'د. سمير الوهراني',
      role: 'DIRECTOR',
      directorate_id: secondDirId
    })
  });
  assert(createDirectorRes.status === 201 && createDirectorRes.data.success, 'المشرف العام ينشئ حساب مدير للمديرية الثانية');

  // 1.5 View subscriptions and activity logs as SuperAdmin
  const subsRes = await request('/api/admin/subscriptions', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(subsRes.status === 200 && subsRes.data.data.length >= 2, 'المشرف العام يسترجع قائمة اشتراكات كافة المديريات');

  const logsRes = await request('/api/admin/activity-logs', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(logsRes.status === 200 && logsRes.data.data.length > 0, 'المشرف العام يسترجع سجل النشاطات المركزي للمنصة');

  // -------------------------------------------------------------
  // Test 2: DIRECTOR Restrictions and Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n2. اختبار قيود المدير وعزل المديريات (DIRECTOR):');
  const dirAuth = await login('director', 'director12345');
  assert(dirAuth && dirAuth.success && dirAuth.user?.role === 'DIRECTOR', 'تسجيل دخول مدير الإقامة الأولى');
  const dirToken = dirAuth.token;

  // 2.1 Director cannot access admin routes
  const dirAccessAdmin = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(dirAccessAdmin.status === 403, 'منع المدير من الوصول لقائمة المديريات الإدارية (403 Forbidden)');

  const dirCreateDept = await request('/api/admin/departments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dirToken}` },
    body: JSON.stringify({
      directorate_id: 1,
      code: 'illegal_dept',
      name: 'مصلحة غير مصرح بها'
    })
  });
  assert(dirCreateDept.status === 403, 'منع المدير من إنشاء مصالح جديدة (SUPER_ADMIN فقط)');

  // 2.2 Director can only see departments of their own directorate
  const dirDepts = await request('/api/departments', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  const allInOwnDir = dirDepts.data.data.every(d => d.directorate_id === dirAuth.user.directorateId);
  assert(allInOwnDir && !dirDepts.data.data.some(d => d.id === secondDeptId), 'المدير يرى فقط مصالح مديريته ولا يرى مصالح المديرية الثانية');

  // 2.3 Director can only see users of their own directorate
  const dirUsers = await request('/api/users', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  const allUsersInOwnDir = dirUsers.data.data.every(u => u.directorate_id === dirAuth.user.directorateId);
  assert(allUsersInOwnDir, 'المدير يرى فقط مستخدمي مديريته دون مستخدمي المديريات الأخرى');

  // 2.4 Director issues a directive (scoped to directorate)
  const dirDirectiveRes = await request('/api/directives', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dirToken}` },
    body: JSON.stringify({
      title: 'توجيه متابعة عام لمديرية 1',
      content: 'توجيه إداري رسمي للتنفيذ الفوري',
      target_type: 'ALL',
      priority: 'HIGH'
    })
  });
  assert(dirDirectiveRes.status === 201 && dirDirectiveRes.data.success, 'المدير يصدر توجيهاً عاماً لمديريته بنجاح');
  const directive1Id = dirDirectiveRes.data.directiveId;

  // 2.5 Check department statuses for this directive: must only contain departments of directorate 1
  const deptStatusRes = await request(`/api/directives/${directive1Id}/departments-status`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  const deptsList = deptStatusRes.data?.departments || [];
  assert(deptStatusRes.status === 200 && deptsList.length === 6, 'تم إنشاء سجلات متابعة مستقلة للمصالح الستة التابعة لهذه المديرية فقط');
  const hasForeignDept = deptsList.some(s => s.department_id === secondDeptId);
  assert(!hasForeignDept, 'عدم وجود أي مصلحة من المديريات الأخرى في متابعة التوجيه');

  // -------------------------------------------------------------
  // Test 3: DEPARTMENT_HEAD Restrictions and Isolation
  // -------------------------------------------------------------
  console.log('\n3. اختبار قيود رئيس المصلحة (DEPARTMENT_HEAD):');
  const headAuth = await login('head_medical', 'medical12345');
  assert(headAuth && headAuth.success && headAuth.user?.role === 'DEPARTMENT_HEAD', 'تسجيل دخول رئيس مصلحة الطب');
  const headToken = headAuth.token;

  // 3.1 Cannot access admin or director endpoints
  const headAccessAdmin = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  assert(headAccessAdmin.status === 403, 'منع رئيس المصلحة من لوحة الإشراف (403)');

  const headCreateDirective = await request('/api/directives', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify({ title: 'محاولة غير مصرح بها', content: 'نص' })
  });
  assert(headCreateDirective.status === 403, 'منع رئيس المصلحة من إصدار التوجيهات (403)');

  // 3.2 Can only see their own department
  const headDepts = await request('/api/departments', {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  assert(headDepts.data.data.length === 1 && headDepts.data.data[0].id === headAuth.user.departmentId, 'رئيس المصلحة يرى مصلحته فقط دون غيرها');

  // 3.3 Acknowledges their directive independently
  const ackRes = await request(`/api/directives/${directive1Id}/acknowledge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` }
  });
  assert(ackRes.status === 200 && ackRes.data.success, 'رئيس المصلحة يؤكد الاطلاع على التوجيه بنجاح');

  // Check that other departments in directorate 1 are still NEW
  const checkStatusRes = await request(`/api/directives/${directive1Id}/departments-status`, {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  const checkDepts = checkStatusRes.data?.departments || [];
  const medStatus = checkDepts.find(s => s.department_id === headAuth.user.departmentId);
  const otherStatuses = checkDepts.filter(s => s.department_id !== headAuth.user.departmentId);
  assert(medStatus && medStatus.status === 'ACKNOWLEDGED', 'حالة مصلحة الطب أصبحت ACKNOWLEDGED');
  assert(otherStatuses.length === 5 && otherStatuses.every(s => s.status === 'NEW'), 'حالات باقي المصالح الخمسة لا تزال NEW بشكل مستقل');

  // -------------------------------------------------------------
  // Test 4: Directorate Inactivation / Subscription Suspension Test
  // -------------------------------------------------------------
  console.log('\n4. اختبار تعطيل المديرية وتعليق الاشتراك:');
  const toggleDirRes = await request(`/api/admin/directorates/${secondDirId}/toggle-status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(toggleDirRes.status === 200 && toggleDirRes.data.is_active === 0, 'المشرف العام يعطل حساب المديرية الثانية بنجاح');

  // Try to login with director of deactivated directorate
  const deactLoginRes = await login(`director_oran_${createDirectorRes.data.userId}`, 'oran12345Password');
  // Or using the actual username:
  const directUsername = (await request(`/api/users`, { headers: { Authorization: `Bearer ${superToken}` } })).data?.data?.find(u => u.directorate_id === secondDirId && u.role === 'DIRECTOR')?.username;
  if (directUsername) {
    const loginDeact = await login(directUsername, 'oran12345Password');
    assert(loginDeact.success === false, 'رفض تسجيل دخول المستخدم التابع لمديرية معطلة بنجاح');
  }

  // Reactivate directorate
  await request(`/api/admin/directorates/${secondDirId}/toggle-status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` }
  });

  console.log('\n=================================================================');
  console.log(`  نتائج الاختبارات: ${passedTests} ناجح | ${failedTests} فاشل`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
