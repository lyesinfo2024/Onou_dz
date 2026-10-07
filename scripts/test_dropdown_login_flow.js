// scripts/test_dropdown_login_flow.js
import http from 'http';

async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('=================================================================');
  console.log('  اختبار واجهة تسجيل الدخول بالقائمة المنسدلة والتحقق من المديرية  ');
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

  // --- 1. جلب قائمة المديريات لتغذية القائمة المنسدلة ---
  console.log('📌 1. فحص جلب قائمة المديريات النشطة لتغذية الـ Dropdown:');
  const pubRes = await request('/api/public/directorates');
  assert(pubRes.status === 200 && pubRes.data.success, 'جلب قائمة المديريات النشطة بنجاح');
  const directorates = pubRes.data.data;
  assert(Array.isArray(directorates) && directorates.length > 0, `عدد المديريات المسترجعة: ${directorates.length}`);
  
  const medeaDir = directorates.find(d => d.code === 'DIR-MEDEA-01' || d.name.includes('المدية'));
  assert(!!medeaDir, `مديرية الخدمات الجامعية المدية موجودة بالقائمة (ID: ${medeaDir?.id})`);
  const medeaDirId = medeaDir?.id;

  // --- 2. التحقق من الحسابات التجريبية ---
  console.log('\n📌 2. تحديد بيانات حساب مدير المدية وحساب مدير الإقامة 1:');
  const accountsRes = await request('/api/system/demo-accounts');
  const medeaGroup = accountsRes.data.directorates.find(d => d.directorateId === medeaDirId);
  const medeaDirector = medeaGroup?.users?.find(u => u.role === 'DIRECTOR');
  assert(!!medeaDirector, `العثور على مدير المدية: "${medeaDirector?.fullName}" (@${medeaDirector?.username})`);

  const centralGroup = accountsRes.data.directorates.find(d => d.directorateId === 1);
  const centralDirector = centralGroup?.users?.find(u => u.role === 'DIRECTOR');
  assert(!!centralDirector, `العثور على مدير الإقامة المركزية 1: "${centralDirector?.fullName}" (@${centralDirector?.username})`);

  // --- 3. تسجيل الدخول باختيار المديرية الصحيحة (مديرية المدية) ---
  console.log('\n📌 3. تسجيل الدخول باختيار مديرية المدية مع حساب مدير المدية:');
  const validMedeaLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: medeaDirector.username,
      password: 'MedeaDirector123',
      directorateId: medeaDirId
    })
  });
  assert(validMedeaLogin.status === 200 && validMedeaLogin.data.success, 'نجاح تسجيل دخول مدير المدية مع اختيار مديرية المدية');
  assert(validMedeaLogin.data.user.directorateId === medeaDirId, `تأكيد ارتباط الجلسة بالمديرية #${medeaDirId}`);
  const medeaToken = validMedeaLogin.data.token;

  // التحقق من استرجاع مصالح المدية فقط
  const medeaDepts = await request('/api/departments', {
    headers: { Authorization: `Bearer ${medeaToken}` }
  });
  assert(medeaDepts.status === 200 && medeaDepts.data.data.length > 0, 'استرجاع مصالح مديرية المدية بنجاح');
  const allMedea = medeaDepts.data.data.every(d => d.directorate_id === medeaDirId || d.directorateId === medeaDirId);
  assert(allMedea, 'كافة المصالح المعروضة تتبع مديرية المدية حصراً (عزل تام)');

  // --- 4. اختبار الأمان: منع الدخول عند عدم تطابق المديرية المختارة (المتطلب 8 و 9) ---
  console.log('\n📌 4. اختبار أمني: محاولة الدخول باختيار مديرية أخرى لا ينتمي إليها المستخدم:');
  // مدير المدية يحاول تسجيل الدخول باختيار الإقامة المركزية 1 (directorateId = 1)
  const crossAttack1 = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: medeaDirector.username,
      password: 'MedeaDirector123',
      directorateId: 1 // خطأ أو تلاعب
    })
  });
  assert(crossAttack1.status === 401 && crossAttack1.data.error.includes('غير مسجل ضمن المديرية المختارة'), 'تم حظر تسجيل دخول مدير المدية عند اختيار مديرية أخرى (401)');

  // مدير الإقامة المركزية 1 يحاول تسجيل الدخول باختيار مديرية المدية (directorateId = 5)
  const crossAttack2 = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: centralDirector.username,
      password: 'director12345',
      directorateId: medeaDirId // خطأ أو تلاعب
    })
  });
  assert(crossAttack2.status === 401 && crossAttack2.data.error.includes('غير مسجل ضمن المديرية المختارة'), 'تم حظر تسجيل دخول مدير المركزية عند اختيار مديرية المدية (401)');

  // --- 5. اختبار المشرف العام SUPER_ADMIN (المتطلب 12) ---
  console.log('\n📌 5. اختبار دخول المشرف العام SUPER_ADMIN كحساب مركزي:');
  const superLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'superadmin',
      password: 'superadmin12345',
      directorateId: 'SUPER_ADMIN'
    })
  });
  assert(superLogin.status === 200 && superLogin.data.success, 'نجاح تسجيل دخول المشرف العام SUPER_ADMIN');
  assert(superLogin.data.user.role === 'SUPER_ADMIN', 'المشرف العام له الدور SUPER_ADMIN');
  assert(superLogin.data.user.directorateId === null, 'المشرف العام مركزي وغير مقيد بمديرية واحدة');

  const superToken = superLogin.data.token;
  const adminDirs = await request('/api/admin/directorates', {
    headers: { Authorization: `Bearer ${superToken}` }
  });
  assert(adminDirs.status === 200 && adminDirs.data.data.length >= directorates.length, 'المشرف العام يسترجع ويتحكم في جميع المديريات');

  console.log('\n=================================================================');
  console.log(`  نتائج الاختبارات: ${passedTests} ناجح / ${failedTests} فاشل`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
