// scripts/test_dynamic_login_flow.js
import http from 'http';

async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('=================================================================');
  console.log('  اختبار شاشة تسجيل الدخول الديناميكية (Multi-Tenant SaaS Login)  ');
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

  // --- 1. فحص الـ API العام لجلب المديريات النشطة لشاشة الدخول ---
  console.log('📌 1. فحص مسار جلب المديريات النشطة ديناميكياً (/api/public/directorates):');
  const pubDirsRes = await request('/api/public/directorates');
  assert(pubDirsRes.status === 200 && pubDirsRes.data.success, 'نجاح استدعاء مسار المديريات النشطة');
  const directorates = pubDirsRes.data.data;
  assert(Array.isArray(directorates) && directorates.length > 0, `تم جلب ${directorates.length} مديرية نشطة`);

  // التأكد من ظهور مديرية الخدمات الجامعية المدية تلقائياً
  const medeaDir = directorates.find(d => d.code === 'DIR-MEDEA-01' || d.name.includes('المدية'));
  assert(!!medeaDir, `مديرية الخدمات الجامعية المدية موجودة وظاهرة ديناميكياً (ID: ${medeaDir?.id}, Code: ${medeaDir?.code})`);
  assert(medeaDir?.director_name !== undefined, `اسم المدير المسترجع للمدية: "${medeaDir?.director_name || 'غير معين'}"`);
  assert(medeaDir?.departments_count !== undefined, `عدد مصالح المدية المسترجع: ${medeaDir?.departments_count}`);

  // --- 2. فحص مسار الحسابات التجريبية الديناميكي (/api/system/demo-accounts) ---
  console.log('\n📌 2. فحص مسار الحسابات الديناميكي المتوافق مع Multi-Tenant:');
  const demoRes = await request('/api/system/demo-accounts');
  assert(demoRes.status === 200 && demoRes.data.success, 'استرجاع الحسابات بنجاح');
  assert(!!demoRes.data.superAdmin, 'وجود حساب المشرف العام المركزي (SUPER_ADMIN)');
  assert(demoRes.data.superAdmin.identifier === 'superadmin', 'اسم مستخدم المشرف العام superadmin');

  const medeaGroup = demoRes.data.directorates.find(d => d.directorateCode === 'DIR-MEDEA-01' || d.directorateName.includes('المدية'));
  assert(!!medeaGroup, 'ظهور مجموعة مستخدمي مديرية المدية ديناميكياً داخل قائمة الحسابات');
  const medeaDirectorUser = medeaGroup?.users?.find(u => u.role === 'DIRECTOR');
  assert(!!medeaDirectorUser, `العثور على مدير مديرية المدية: "${medeaDirectorUser?.fullName}" (@${medeaDirectorUser?.username})`);

  // --- 3. تسجيل الدخول كـ المشرف العام SUPER_ADMIN والتأكد من صلاحه لرؤية كل المديريات ---
  console.log('\n📌 3. تسجيل الدخول كـ المشرف العام (SUPER_ADMIN):');
  const superLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'superadmin', password: 'superadmin12345' })
  });
  assert(superLogin.status === 200 && superLogin.data.success, 'تسجيل دخول المشرف العام بنجاح');
  assert(superLogin.data.user.role === 'SUPER_ADMIN', 'دور المستخدم هو SUPER_ADMIN');
  assert(superLogin.data.user.directorateId === null, 'المشرف العام غير مقيد بمديرية واحدة (حساب مركزي)');
  const superToken = superLogin.data.token;

  // المشرف العام يرى كل المديريات
  const superDirsList = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(superDirsList.status === 200 && superDirsList.data.data.length >= directorates.length, 'المشرف العام يسترجع قائمة كافة المديريات في المنصة');

  // --- 4. تسجيل الدخول كـ مدير المدية والتأكد من عزله الصارم ---
  console.log('\n📌 4. تسجيل الدخول بحساب مدير مديرية المدية:');
  const dirLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: medeaDirectorUser.username, password: 'MedeaDirector123' })
  });
  assert(dirLogin.status === 200 && dirLogin.data.success, 'تسجيل دخول مدير المدية بنجاح');
  assert(dirLogin.data.user.role === 'DIRECTOR', 'دور المستخدم هو DIRECTOR');
  assert(dirLogin.data.user.directorateId === medeaDir.id, `مدير المدية مرتبط حصراً بالمديرية #${medeaDir.id}`);
  const dirToken = dirLogin.data.token;

  // مدير المدية يسترجع فقط المصالح التابعة للمدية
  const dirDepts = await request('/api/departments', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(dirDepts.status === 200 && Array.isArray(dirDepts.data.data), 'مدير المدية يسترجع المصالح التابعة له');
  const allBelongToMedea = dirDepts.data.data.every(d => d.directorate_id === medeaDir.id || d.directorateId === medeaDir.id);
  assert(allBelongToMedea, 'كافة المصالح المسترجعة لمدير المدية تخص مديرية المدية حصراً (عزل تام)');

  // مدير المدية ممنوع من الوصول لإدارة المديريات أو تفاصيل مديرية أخرى
  const forbiddenAdmin = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(forbiddenAdmin.status === 403, 'منع مدير المدية من الوصول إلى لوحة إدارة المديريات (403 Forbidden)');

  const forbiddenOtherDir = await request('/api/admin/directorates/1', {
    headers: { Authorization: `Bearer ${dirToken}` }
  });
  assert(forbiddenOtherDir.status === 403, 'منع مدير المدية من الوصول لبيانات مديرية أخرى (403 Forbidden)');

  // --- 5. محاكاة تسجيل الخروج والعودة لشاشة الدخول والتحقق من بقاء المدية وظهورها ---
  console.log('\n📌 5. محاكاة تسجيل الخروج والعودة لشاشة تسجيل الدخول:');
  const refreshPublic = await request('/api/public/directorates');
  assert(refreshPublic.status === 200, 'إعادة طلب شاشة الدخول بعد تسجيل الخروج بنجاح');
  const stillHasMedea = refreshPublic.data.data.some(d => d.code === 'DIR-MEDEA-01');
  assert(stillHasMedea, 'مديرية المدية ما زالت موجودة وظاهرة ديناميكياً بعد تسجيل الخروج دون أي فقدان للبيانات');

  console.log('\n=================================================================');
  console.log(`  نتيجة الاختبارات: ${passedTests} ناجح / ${failedTests} فاشل`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
