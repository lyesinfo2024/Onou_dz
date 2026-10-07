// scripts/test_login_view_clean.js
// Automated verification for the Clean Production LoginView

async function testCleanLogin() {
  const baseUrl = 'http://localhost:3000';
  console.log('=================================================================');
  console.log('  اختبارات واجهة تسجيل الدخول الإنتاجية النظيفة (Production UI)');
  console.log('=================================================================');

  // 1. Check /api/public/directorates
  console.log('\n📌 1. فحص بيانات /api/public/directorates:');
  const res = await fetch(`${baseUrl}/api/public/directorates`);
  const data = await res.json();

  if (!data.success || !Array.isArray(data.data)) {
    console.error('❌ فشل جلب المديريات');
    process.exit(1);
  }
  console.log(`  ✅ نجاح جلب المديريات: تم العثور على ${data.data.length} مديرية نشطة`);

  // Verify no sensitive fields (password, password_hash, JWT, token)
  let hasSensitive = false;
  for (const dir of data.data) {
    if (dir.password || dir.password_hash || dir.token || dir.jwt) {
      hasSensitive = true;
    }
  }
  if (!hasSensitive) {
    console.log('  ✅ [أمان] التحقق من عدم إرسال كلمات المرور أو الهاش أو التوكن في الـ API العام');
  } else {
    console.error('  ❌ خطأ أمني: تم إرسال حقول حساسة!');
    process.exit(1);
  }

  // 2. Medea directorate check
  const medea = data.data.find(d => d.code === 'DIR-MEDEA-01' || d.id === 5);
  if (medea) {
    console.log(`  ✅ تم العثور على مديرية المدية: "${medea.name}"`);
    console.log(`     - اسم المدير: "${medea.director_name}"`);
    console.log(`     - اسم المستخدم / الحساب: "${medea.director_username}"`);
    console.log(`     - البريد الإلكتروني: "${medea.director_email}"`);
    if (medea.director_username === 'dir_medea_7797') {
      console.log('  ✅ [تطابق] حساب مدير المدية هو dir_medea_7797');
    }
  } else {
    console.error('❌ لم يتم العثور على مديرية المدية');
    process.exit(1);
  }

  // 3. Central residence directorate check
  const central = data.data.find(d => d.id === 1);
  if (central) {
    console.log(`  ✅ تم العثور على المديرية المركزية #1: "${central.name}"`);
    console.log(`     - اسم المستخدم للمدير: "${central.director_username}"`);
    console.log(`     - البريد الإلكتروني: "${central.director_email}"`);
  }

  // 4. Test login with Medea Director using temporary testing password Medea@2026
  console.log('\n📌 2. اختبار تسجيل الدخول الفعلي لمدير المدية بكلمة المرور المؤقتة (Medea@2026) مع directorateId = 5:');
  const loginMedeaRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: medea.director_username,
      password: 'Medea@2026',
      directorateId: 5
    })
  });
  const medeaLoginData = await loginMedeaRes.json();
  if (medeaLoginData.success && medeaLoginData.token) {
    console.log('  ✅ نجاح تسجيل دخول مدير المدية بكلمة المرور Medea@2026');
    console.log(`     - الدور: ${medeaLoginData.user.role}`);
    console.log(`     - المديرية: #${medeaLoginData.user.directorate_id} (${medeaLoginData.user.directorate_name})`);
  } else {
    console.error('  ❌ فشل تسجيل دخول مدير المدية:', medeaLoginData);
    process.exit(1);
  }

  // 5. Test isolation: Attempt to login as Medea Director with different directorateId (e.g. 1)
  console.log('\n📌 3. اختبار عزل المديريات (منع الدخول لمديرية أخرى):');
  const spoofLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: medea.director_username,
      password: 'Medea@2026',
      directorateId: 1
    })
  });
  const spoofData = await spoofLoginRes.json();
  if (!spoofData.success && (spoofLoginRes.status === 401 || spoofLoginRes.status === 403)) {
    console.log(`  ✅ [نجاح العزل] تم منع مدير المدية من تسجيل الدخول للمديرية #1: "${spoofData.error}"`);
  } else {
    console.error('  ❌ فشل العزل: سمح للمستخدم بتغيير المديرية بدون تطابق!', spoofData);
    process.exit(1);
  }

  // 6. Test SUPER_ADMIN login
  console.log('\n📌 4. اختبار تسجيل دخول المشرف العام SUPER_ADMIN:');
  const superLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'superadmin',
      password: 'superadmin12345',
      directorateId: 'SUPER_ADMIN'
    })
  });
  const superData = await superLoginRes.json();
  if (superData.success && superData.user.role === 'SUPER_ADMIN') {
    console.log('  ✅ نجاح تسجيل دخول المشرف العام المركزي SUPER_ADMIN');
    console.log(`     - الاسم: ${superData.user.fullName}`);
    console.log(`     - الدور: ${superData.user.role}`);
  } else {
    console.error('  ❌ فشل تسجيل دخول SUPER_ADMIN:', superData);
    process.exit(1);
  }

  console.log('\n=================================================================');
  console.log('  جميع اختبارات تسجيل الدخول والواجهة النظيفة اكتملت بنجاح 100%!');
  console.log('=================================================================');
}

testCleanLogin().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
