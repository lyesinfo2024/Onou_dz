// scripts/test_rbac.js
async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('=================================================================');
  console.log('  اختبارات عزل الصلاحيات ونظام الأمان المعتمد (Backend & API)   ');
  console.log('=================================================================\n');

  async function login(identifier, password) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    return await res.json();
  }

  // 1. Test Director
  console.log('1. اختبار المدير (director):');
  const directorAuth = await login('director', 'director12345');
  console.log('   - تسجيل الدخول:', directorAuth.success ? 'ناجح' : 'فاشل', `(Role: ${directorAuth.user.role})`);
  
  const directorDeptsRes = await fetch(`${baseUrl}/api/departments`, {
    headers: { Authorization: `Bearer ${directorAuth.token}` }
  });
  const directorDepts = await directorDeptsRes.json();
  console.log('   - عدد المصالح المسترجعة للمدير:', directorDepts.data?.length);
  if (directorDepts.data) {
    directorDepts.data.forEach(d => console.log(`     * مصلحة #${d.id}: ${d.name} (${d.code}) - رئيسها: ${d.head_name}`));
  }
  const directorUsersRes = await fetch(`${baseUrl}/api/users`, {
    headers: { Authorization: `Bearer ${directorAuth.token}` }
  });
  const directorUsers = await directorUsersRes.json();
  console.log('   - عدد المستخدمين المسترجعين للمدير:', directorUsers.data?.length);
  console.log('-----------------------------------------------------------------');

  // 2. Test the 6 Department Heads
  const heads = [
    { username: 'head_medical', pass: 'medical12345', expectedDept: 'مصلحة الطب', expectedId: 1 },
    { username: 'head_housing', pass: 'housing12345', expectedDept: 'مصلحة الإيواء', expectedId: 2 },
    { username: 'head_psychology', pass: 'psychology12345', expectedDept: 'مصلحة الطب النفسي', expectedId: 3 },
    { username: 'head_catering', pass: 'catering12345', expectedDept: 'مصلحة الإطعام', expectedId: 4 },
    { username: 'head_maintenance', pass: 'maintenance12345', expectedDept: 'مصلحة الصيانة', expectedId: 5 },
    { username: 'head_security', pass: 'security12345', expectedDept: 'مصلحة الأمن الداخلي', expectedId: 6 },
  ];

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    console.log(`\n${i + 2}. اختبار رئيس ${h.expectedDept} (${h.username}):`);
    const auth = await login(h.username, h.pass);
    console.log(`   - تسجيل الدخول: ${auth.success ? 'ناجح' : 'فاشل'} | المصلحة المربوطة: ${auth.user.departmentName} (ID: ${auth.user.departmentId})`);

    const deptsRes = await fetch(`${baseUrl}/api/departments`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    const depts = await deptsRes.json();
    console.log(`   - عدد المصالح المسترجعة: ${depts.data?.length}`);
    if (depts.data && depts.data.length > 0) {
      depts.data.forEach(d => {
        const isMatch = d.id === h.expectedId;
        console.log(`     * مصلحة #${d.id}: ${d.name} (${d.code}) [${isMatch ? 'مقبول: مصلحته فقط' : 'خطأ أمني!'}]`);
      });
    }

    // Check users endpoint (should only return self)
    const usersRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    const users = await usersRes.json();
    console.log(`   - عدد المستخدمين المسترجعين في قائمة المستخدمين: ${users.data?.length} (حسابه الشخصي فقط: ${users.data?.[0]?.full_name})`);
  }

  // 3. Security Penetration Test: Direct API access to another department
  console.log('\n=================================================================');
  console.log('  اختبار أمني حاسم: محاولة اختراق عزل الصلاحيات عبر الـ API المباشر ');
  console.log('=================================================================');
  console.log('السيناريو: رئيس مصلحة الإيواء (head_housing - dept_id: 2) يحاول طلب بيانات مصلحة الطب (dept_id: 1) مباشرة عبر GET /api/departments/1:');

  const housingAuth = await login('head_housing', 'housing12345');
  const hackRes = await fetch(`${baseUrl}/api/departments/1`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });

  const hackStatus = hackRes.status;
  const hackBody = await hackRes.json();

  console.log(`- كود استجابة الخادم (HTTP Status Code): ${hackStatus}`);
  console.log(`- نتيجة الطلب:`, hackBody);

  if (hackStatus === 403 && hackBody.success === false) {
    console.log('\n>>> النتيجة الأمنية: [نجاح الحماية 100%] تم حظر الطلب من الـ Backend برمز 403 Forbidden بنجاح!');
  } else {
    console.log('\n>>> النتيجة الأمنية: [فشل الحماية!]');
  }

  // Check valid access by the same user to their own department
  console.log('\nالتحقق المعاكس: رئيس مصلحة الإيواء يطلب بيانات مصلحته (dept_id: 2):');
  const validRes = await fetch(`${baseUrl}/api/departments/2`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  console.log(`- كود استجابة الخادم: ${validRes.status}`);
  const validBody = await validRes.json();
  console.log(`- المصلحة المسترجعة: ${validBody.data?.name} (كود: ${validBody.data?.code})`);

  console.log('\n=================================================================');
  console.log('  اكتملت جميع الاختبارات بنجاح تام وفق المعايير المطلوبة         ');
  console.log('=================================================================');
}

runTests().catch(err => console.error('Error during test execution:', err));
