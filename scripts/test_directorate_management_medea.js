// scripts/test_directorate_management_medea.js
import http from 'http';

async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('=================================================================');
  console.log('  اختبارات إدارة المديريات ومطابقة المتطلبات لـ SUPER_ADMIN');
  console.log('  حالة الاختبار: مديرية الخدمات الجامعية المدية (DIR-MEDEA-01)');
  console.log('=================================================================\n');

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

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      };

      const req = http.request(url, reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      });

      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  // --- 1. تسجيل الدخول كـ SUPER_ADMIN ---
  console.log('📌 1. تسجيل الدخول كـ المشرف العام SUPER_ADMIN:');
  const superLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'superadmin', password: 'superadmin12345' })
  });
  assert(superLoginRes.status === 200 && superLoginRes.data.success, 'تسجيل دخول المشرف العام superadmin بنجاح');
  const superToken = superLoginRes.data?.token || superLoginRes.data?.data?.token;

  // --- 2. التحقق من وجود مديرية الخدمات الجامعية المدية DIR-MEDEA-01 ---
  console.log('\n📌 2. التحقق من وجود المديرية في قائمة المديريات:');
  const dirsRes = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(dirsRes.status === 200 && Array.isArray(dirsRes.data.data), 'استرجاع قائمة المديريات بنجاح');
  
  const medeaDir = dirsRes.data.data.find(d => d.code === 'DIR-MEDEA-01');
  assert(!!medeaDir, `تم العثور على مديرية الخدمات الجامعية المدية (DIR-MEDEA-01) بالمعرف #${medeaDir?.id}`);
  const medeaDirId = medeaDir?.id;

  // فحص حقول الإحصائيات في بطاقة المديرية (المتطلب 10)
  assert('departments_count' in medeaDir, 'بطاقة المديرية تتضمن إحصائية عدد المصالح');
  assert('users_count' in medeaDir, 'بطاقة المديرية تتضمن إحصائية عدد المستخدمين');
  assert('subscription_status' in medeaDir, 'بطاقة المديرية تتضمن حالة الاشتراك');
  assert('director_name' in medeaDir, 'بطاقة المديرية تتضمن اسم المدير إن وجد');

  // --- 3. استرجاع تفاصيل المديرية الكاملة (المتطلب 2) ---
  console.log('\n📌 3. فتح لوحة إدارة المديرية واسترجاع بياناتها التفصيلية:');
  const detailRes = await request(`/api/admin/directorates/${medeaDirId}`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(detailRes.status === 200 && detailRes.data.success, 'استرجاع تفاصيل المديرية بنجاح');
  assert(detailRes.data.data.directorate.name === 'مديرية الخدمات الجامعية المدية', 'تطابق اسم المديرية في اللوحة');
  assert(detailRes.data.data.directorate.code === 'DIR-MEDEA-01', 'تطابق كود المديرية في اللوحة');
  assert(!!detailRes.data.data.subscription, 'ظهور بيانات اشتراك المديرية (الحالة، البداية، النهاية)');

  // --- 4. إدارة المصالح لمديرية المدية (المتطلب 3) ---
  console.log('\n📌 4. قسم المصالح: إنشاء وتعديل وتعطيل مصالح تابعة حصرياً للمدية:');
  const deptCode = 'catering_medea_' + Date.now().toString().slice(-4);
  const createDeptRes = await request('/api/admin/departments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      directorate_id: medeaDirId,
      name: 'مصلحة الإطعام والإيواء بالمدية',
      code: deptCode,
      description: 'مصلحة تسيير الإطعام والإيواء بالخدمات الجامعية المدية',
      icon: 'Building2'
    })
  });
  assert(createDeptRes.status === 201 && createDeptRes.data.success, 'نجاح إنشاء مصلحة جديدة لمديرية المدية');
  const newDeptId = createDeptRes.data?.departmentId;

  // تعديل المصلحة
  const updateDeptRes = await request(`/api/admin/departments/${newDeptId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      name: 'مصلحة الإطعام والإيواء المركزية بالمدية',
      description: 'وصف محدث للمصلحة'
    })
  });
  assert(updateDeptRes.status === 200 && updateDeptRes.data.success, 'نجاح تعديل بيانات المصلحة');

  // تعطيل المصلحة ثم إعادة تفعيلها
  const toggleDeptRes = await request(`/api/admin/departments/${newDeptId}/toggle-status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(toggleDeptRes.status === 200 && toggleDeptRes.data.is_active === 0, 'نجاح تعطيل المصلحة');
  const toggleDeptBack = await request(`/api/admin/departments/${newDeptId}/toggle-status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(toggleDeptBack.status === 200 && toggleDeptBack.data.is_active === 1, 'نجاح إعادة تفعيل المصلحة');

  // التأكد من أن المصلحة تنتمي للمدية فقط ولا تظهر للمديريات الأخرى
  const medeaUpdatedDetail = await request(`/api/admin/directorates/${medeaDirId}`, {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  const medeaDepts = medeaUpdatedDetail.data.data.departments;
  assert(medeaDepts.some(d => d.id === newDeptId), 'المصلحة تظهر في قائمة مصالح مديرية المدية');

  const dir1Detail = await request('/api/admin/directorates/1', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(!dir1Detail.data.data.departments.some(d => d.id === newDeptId), 'المصلحة لا تظهر مطلقاً في مصالح المديريات الأخرى');

  // --- 5. قسم المدير (المتطلب 4) ---
  console.log('\n📌 5. قسم المدير: إنشاء وتعديل حساب مدير للمدية ومنع تعدد المديرين الفعالين:');
  let directorUsername = '';
  let directorUserId = null;
  const existingDirector = detailRes.data?.data?.director;

  if (existingDirector && existingDirector.is_active === 1) {
    directorUserId = existingDirector.id;
    directorUsername = existingDirector.username;
    console.log(`   (المدير الحالي مسجل: ${existingDirector.full_name} - @${directorUsername})`);
    passedTests++; // Existing director verified

    // محاولة إنشاء مدير ثانٍ مفعّل لنفس المديرية -> يجب أن يرفض النظام (المتطلب 4)
    const createSecondDirRes = await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        username: 'second_dir_' + Date.now().toString().slice(-4),
        email: `second_${Date.now()}@dou-medea.dz`,
        password: 'MedeaDirector123',
        full_name: 'مدير ثان تجريبي',
        role: 'DIRECTOR',
        directorate_id: medeaDirId
      })
    });
    assert(createSecondDirRes.status === 400 && createSecondDirRes.data.error.includes('مدير مفعّل'), 'منع إنشاء أكثر من مدير مفعّل لنفس المديرية');

    // تعديل بيانات المدير
    const updateDirectorRes = await request(`/api/admin/users/${directorUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        phone: '0550999888',
        password: 'MedeaDirector123'
      })
    });
    assert(updateDirectorRes.status === 200 && updateDirectorRes.data.success, 'نجاح تعديل بيانات حساب المدير');

    // تفعيل / تعطيل
    const toggleDirRes = await request(`/api/admin/users/${directorUserId}/toggle-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert(toggleDirRes.status === 200 && toggleDirRes.data.is_active === 0, 'نجاح تعطيل حساب المدير');

    const toggleDirBack = await request(`/api/admin/users/${directorUserId}/toggle-status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` }
    });
    assert(toggleDirBack.status === 200 && toggleDirBack.data.is_active === 1, 'نجاح إعادة تفعيل حساب المدير');
  } else {
    directorUsername = 'dir_medea_' + Date.now().toString().slice(-4);
    const createDirUserRes = await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        username: directorUsername,
        email: `${directorUsername}@dou-medea.dz`,
        password: 'MedeaDirector123',
        full_name: 'د. سليم المداني - مدير الخدمات الجامعية المدية',
        role: 'DIRECTOR',
        directorate_id: medeaDirId,
        phone: '0550123456'
      })
    });
    assert(createDirUserRes.status === 201 && createDirUserRes.data.success, 'نجاح إنشاء حساب مدير لمديرية المدية');
    directorUserId = createDirUserRes.data?.userId;

    // محاولة إنشاء مدير ثانٍ مفعّل لنفس المديرية -> يجب أن يرفض النظام (المتطلب 4)
    const createSecondDirRes = await request('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        username: 'second_' + directorUsername,
        email: `second_${directorUsername}@dou-medea.dz`,
        password: 'MedeaDirector123',
        full_name: 'مدير ثان تجريبي',
        role: 'DIRECTOR',
        directorate_id: medeaDirId
      })
    });
    assert(createSecondDirRes.status === 400 && createSecondDirRes.data.error.includes('مدير مفعّل'), 'منع إنشاء أكثر من مدير مفعّل لنفس المديرية');

    // تعديل بيانات المدير
    const updateDirectorRes = await request(`/api/admin/users/${directorUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        phone: '0550999888'
      })
    });
    assert(updateDirectorRes.status === 200 && updateDirectorRes.data.success, 'نجاح تعديل بيانات حساب المدير');
  }

  // --- 6. قسم رؤساء المصالح (المتطلب 5) ---
  console.log('\n📌 6. قسم رؤساء المصالح: ربط رئيس المصلحة بمصلحة محددة داخل المدية حصراً:');
  const headUsername = 'head_medea_' + Date.now().toString().slice(-4);
  const createHeadRes = await request('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      username: headUsername,
      email: `${headUsername}@dou-medea.dz`,
      password: 'HeadPassword123',
      full_name: 'أ. بلال مرابط - رئيس مصلحة الإطعام',
      role: 'DEPARTMENT_HEAD',
      directorate_id: medeaDirId,
      department_id: newDeptId
    })
  });
  assert(createHeadRes.status === 201 && createHeadRes.data.success, 'نجاح إنشاء حساب رئيس مصلحة وربطه بمصلحة المدية');

  // محاولة ربط رئيس مصلحة بمصلحة تابعة لمديرية أخرى -> يجب أن يرفض Backend (المتطلب 5)
  const invalidHeadUsername = 'invalid_' + headUsername;
  const invalidHeadRes = await request('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      username: invalidHeadUsername,
      email: `${invalidHeadUsername}@dou-medea.dz`,
      password: 'HeadPassword123',
      full_name: 'رئيس وهمي',
      role: 'DEPARTMENT_HEAD',
      directorate_id: medeaDirId,
      department_id: 1 // تابعة للإقامة المركزية 1 وليس للمدية
    })
  });
  assert(invalidHeadRes.status === 400 && invalidHeadRes.data.error.includes('لا تنتمي'), 'منع Backend ربط رئيس المصلحة بمصلحة تابعة لمديرية أخرى');

  // --- 7. قسم الاشتراك (المتطلب 6) ---
  console.log('\n📌 7. قسم الاشتراك: تعديل تاريخ البداية والنهاية وتجديد الاشتراك:');
  const updateSubRes = await request(`/api/admin/directorates/${medeaDirId}/subscription`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      status: 'ACTIVE',
      plan_name: 'PRO_ENTERPRISE',
      start_date: '2026-10-01',
      end_date: '2027-10-01',
      notes: 'اشتراك معتمد ومحدث من المشرف العام'
    })
  });
  assert(updateSubRes.status === 200 && updateSubRes.data.success, 'نجاح تعديل تفاصيل اشتراك المديرية');

  // تجديد الاشتراك
  const renewSubRes = await request(`/api/admin/directorates/${medeaDirId}/subscription/renew`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      end_date: '2028-10-01',
      notes: 'تجديد سنوي معتمد'
    })
  });
  assert(renewSubRes.status === 201 && renewSubRes.data.success, 'نجاح تجديد اشتراك المديرية لسنة إضافية');

  // --- 8. اختبارات الأمان والعزل (المتطلب 7 و 12) ---
  console.log('\n📌 8. اختبارات الأمان والعزل (RBAC & Directorate Isolation):');
  // 8.1 تسجيل دخول مدير المدية (بكلمة المرور المؤقتة للاختبار Medea@2026)
  let dirLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: directorUsername, password: 'Medea@2026' })
  });
  if (!dirLoginRes.data?.success) {
    dirLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: directorUsername, password: 'MedeaDirector123' })
    });
  }
  assert(dirLoginRes.status === 200 && dirLoginRes.data.success, 'تسجيل دخول مدير المدية بنجاح');
  const dirToken = dirLoginRes.data?.token || dirLoginRes.data?.data?.token;

  // مدير المدية يحاول الوصول إلى لوحة إدارة المديريات (محمية بـ SUPER_ADMIN)
  const dirAccessAdmin = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(dirAccessAdmin.status === 403, 'منع مدير المدية من الوصول إلى /api/admin/directorates (403 Forbidden)');

  // مدير المدية يحاول الوصول إلى تفاصيل مديرية أخرى
  const dirAccessOther = await request('/api/admin/directorates/1', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(dirAccessOther.status === 403, 'منع مدير المدية من إدارة مديرية أخرى (403 Forbidden)');

  // مدير المدية يحاول إنشاء مصلحة عبر admin API
  const dirCreateDept = await request('/api/admin/departments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dirToken}` },
    body: JSON.stringify({ directorate_id: medeaDirId, name: 'مصلحة ممنوعة', code: 'forbidden' })
  });
  assert(dirCreateDept.status === 403, 'منع مدير المدية من إنشاء مصلحة عبر admin API (403 Forbidden)');

  // 8.2 تسجيل دخول رئيس المصلحة
  const headLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: headUsername, password: 'HeadPassword123' })
  });
  assert(headLoginRes.status === 200 && headLoginRes.data.success, 'تسجيل دخول رئيس مصلحة المدية بنجاح');
  const headToken = headLoginRes.data?.token || headLoginRes.data?.data?.token;

  // رئيس المصلحة يحاول الوصول إلى صفحات الإدارة
  const headAccessAdmin = await request(`/api/admin/directorates/${medeaDirId}`, {
    headers: { Authorization: `Bearer ${headToken}` }
  });
  assert(headAccessAdmin.status === 403, 'منع رئيس المصلحة من الوصول إلى إدارة المديرية (403 Forbidden)');

  const headCreateUser = await request('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${headToken}` },
    body: JSON.stringify({ username: 'hacker', role: 'DIRECTOR' })
  });
  assert(headCreateUser.status === 403, 'منع رئيس المصلحة من إنشاء مستخدمين (403 Forbidden)');

  console.log('\n=================================================================');
  console.log(`  نتائج الاختبارات: ${passedTests} ناجح / ${failedTests} فاشل`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
