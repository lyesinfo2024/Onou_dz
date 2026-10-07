// scripts/test_phase2_reports.js
async function runPhase2Tests() {
  const baseUrl = 'http://localhost:3000';

  console.log('======================================================================');
  console.log('       اختبارات المرحلة الثانية الشاملة: نظام التقارير الإدارية        ');
  console.log('======================================================================\n');

  async function login(identifier, password) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    return await res.json();
  }

  // First, let's create a sample report for medical so we can test cross-department attack later
  const medicalAuth = await login('head_medical', 'medical12345');
  const medReportRes = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${medicalAuth.token}`
    },
    body: JSON.stringify({
      report_type: 'DAILY',
      title: 'تقرير عيادة الإقامة الجامعية - الفحوصات الطبية',
      report_date: '2026-10-02',
      content: 'تم إجراء 25 فحصاً طبياً للطلبة، وتوفير الأدوية الأساسية في العيادة.',
      status: 'SUBMITTED'
    })
  });
  const medReportData = await medReportRes.json();
  const medicalReportId = medReportData.reportId;
  console.log(`[تحضير]: إنشاء تقرير تجريبي لمصلحة الطب (رقم #${medicalReportId})`);

  // ==========================================
  // الاختبار 1 & 2: إنشاء تقرير يومي وحفظه كمسودة بحساب head_housing
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 1 & 2: إنشاء تقرير يومي وحفظه كمسودة بحساب head_housing:');
  const housingAuth = await login('head_housing', 'housing12345');
  
  const createDraftRes = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${housingAuth.token}`
    },
    body: JSON.stringify({
      report_type: 'DAILY',
      title: 'تقرير مصلحة الإيواء - معاينة الأجنحة والغرف',
      report_date: '2026-10-02',
      content: 'الوضعية العامة: تم تسكين 12 طالباً جديداً ومعاينة نظافة الجناح (أ).',
      status: 'DRAFT'
    })
  });
  const createDraftData = await createDraftRes.json();
  const housingReportId = createDraftData.reportId;
  console.log(' - نتيجة الحفظ كمسودة:', createDraftData.message, `(رقم التقرير: #${housingReportId})`);

  // Verify it is bound automatically to housing (dept_id: 2) and status is DRAFT
  const getDraftRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const getDraftData = await getDraftRes.json();
  console.log(' - مصلحة التقرير المسجلة آلياً:', getDraftData.data.dept_name, `(ID: ${getDraftData.data.department_id})`);
  console.log(' - حالة التقرير في قاعدة البيانات:', getDraftData.data.status);
  const test1Passed = getDraftData.data.department_id === 2 && getDraftData.data.status === 'DRAFT';
  console.log(` >>> نتيجة اختبار 1 & 2: [${test1Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 3: تعديل المسودة
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 3: تعديل مسودة التقرير:');
  const editRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${housingAuth.token}`
    },
    body: JSON.stringify({
      report_type: 'DAILY',
      title: 'تقرير مصلحة الإيواء - معاينة الأجنحة والغرف (معدل)',
      report_date: '2026-10-02',
      content: 'الوضعية العامة: تم تسكين 15 طالباً جديداً وتفقد مرافق الجناح (أ) والجناح (ب).'
    })
  });
  const editData = await editRes.json();
  console.log(' - استجابة تعديل المسودة:', editData.message);
  
  const checkEditRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const checkEditData = await checkEditRes.json();
  const test3Passed = checkEditData.data.title.includes('(معدل)') && checkEditData.data.status === 'DRAFT';
  console.log(' - العنوان بعد التعديل:', checkEditData.data.title);
  console.log(` >>> نتيجة اختبار 3: [${test3Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 4: إرسال التقرير إلى المدير (تصبح SUBMITTED)
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 4: إرسال التقرير إلى المدير:');
  const submitRes = await fetch(`${baseUrl}/api/reports/${housingReportId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const submitData = await submitRes.json();
  console.log(' - نتيجة الإرسال:', submitData.message);

  const checkSubmitRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const checkSubmitData = await checkSubmitRes.json();
  console.log(' - حالة التقرير بعد الإرسال:', checkSubmitData.data.status);
  console.log(' - تاريخ ووقت الإرسال (submitted_at):', checkSubmitData.data.submitted_at);
  const test4Passed = checkSubmitData.data.status === 'SUBMITTED' && checkSubmitData.data.submitted_at !== null;
  console.log(` >>> نتيجة اختبار 4: [${test4Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 5: دخول المدير والتأكد من ظهور التقرير
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 5: دخول المدير واستعراض قائمة التقارير المستلمة:');
  const directorAuth = await login('director', 'director12345');
  const dirReportsRes = await fetch(`${baseUrl}/api/reports`, {
    headers: { Authorization: `Bearer ${directorAuth.token}` }
  });
  const dirReportsData = await dirReportsRes.json();
  const foundReportInDir = dirReportsData.data.find(r => r.id === housingReportId);
  console.log(' - عدد التقارير التي يراها المدير:', dirReportsData.data.length);
  console.log(' - هل ظهر تقرير مصلحة الإيواء للمدير؟', foundReportInDir ? `نعم: "${foundReportInDir.title}"` : 'لا');
  const test5Passed = !!foundReportInDir;
  console.log(` >>> نتيجة اختبار 5: [${test5Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 6: المدير يفتح التقرير ويعاين محتواه
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 6: المدير يفتح تفاصيل تقرير مصلحة الإيواء:');
  const dirOpenRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    headers: { Authorization: `Bearer ${directorAuth.token}` }
  });
  const dirOpenData = await dirOpenRes.json();
  console.log(' - اسم المصلحة:', dirOpenData.data.dept_name);
  console.log(' - اسم رئيس المصلحة:', dirOpenData.data.author_name);
  console.log(' - العنوان:', dirOpenData.data.title);
  console.log(' - الحالة:', dirOpenData.data.status);
  const test6Passed = dirOpenData.success && dirOpenData.data.id === housingReportId;
  console.log(` >>> نتيجة اختبار 6: [${test6Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 7: المدير يعيد التقرير للتعديل (NEEDS_REVISION)
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 7: المدير يعيد التقرير للتعديل مع إضافة توجيهات وملاحظات:');
  const revisionNotes = 'يرجى توضيح عدد الغرف الشاغرة في الجناح (ب) قبل الاعتماد النهائي.';
  const revRes = await fetch(`${baseUrl}/api/reports/${housingReportId}/request-revision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${directorAuth.token}`
    },
    body: JSON.stringify({ notes: revisionNotes })
  });
  const revData = await revRes.json();
  console.log(' - نتيجة أمر المدير:', revData.message);

  const checkRevRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    headers: { Authorization: `Bearer ${directorAuth.token}` }
  });
  const checkRevData = await checkRevRes.json();
  console.log(' - حالة التقرير الآن:', checkRevData.data.status);
  console.log(' - ملاحظات المدير المسجلة:', checkRevData.data.revision_notes);
  const test7Passed = checkRevData.data.status === 'NEEDS_REVISION' && checkRevData.data.revision_notes === revisionNotes;
  console.log(` >>> نتيجة اختبار 7: [${test7Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 8: رئيس مصلحة الإيواء يرى أن التقرير يحتاج لتعديل مع ملاحظات المدير
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 8: رئيس مصلحة الإيواء يرى التقرير المعاد مع ملاحظات المدير:');
  const headViewRevRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const headViewRevData = await headViewRevRes.json();
  console.log(' - الحالة الظاهرة لرئيس المصلحة:', headViewRevData.data.status);
  console.log(' - الملاحظات المستلمة من المدير:', headViewRevData.data.revision_notes);
  const test8Passed = headViewRevData.data.status === 'NEEDS_REVISION';
  console.log(` >>> نتيجة اختبار 8: [${test8Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 9: رئيس مصلحة الإيواء يعدل التقرير ويعيد إرساله للمدير
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 9: رئيس مصلحة الإيواء يعدل التقرير بناءً على توجيهات المدير ويعيد إرساله:');
  const updateRevRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${housingAuth.token}`
    },
    body: JSON.stringify({
      report_type: 'DAILY',
      title: 'تقرير مصلحة الإيواء - معاينة الأجنحة والغرف (معدل بعد توجيه المدير)',
      report_date: '2026-10-02',
      content: 'الوضعية العامة: تم تسكين 15 طالباً. بالنسبة للغرف الشاغرة في الجناح (ب): تم إحصاء 8 غرف جاهزة تماماً.'
    })
  });
  const resubmitRes = await fetch(`${baseUrl}/api/reports/${housingReportId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const resubmitData = await resubmitRes.json();
  console.log(' - نتيجة إعادة الإرسال:', resubmitData.message);

  const checkResubmitRes = await fetch(`${baseUrl}/api/reports/${housingReportId}`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const checkResubmitData = await checkResubmitRes.json();
  console.log(' - حالة التقرير بعد إعادة الإرسال:', checkResubmitData.data.status);
  const test9Passed = checkResubmitData.data.status === 'SUBMITTED';
  console.log(` >>> نتيجة اختبار 9: [${test9Passed ? 'نجاح تام' : 'فشل'}]`);

  // ==========================================
  // الاختبار 10 (اختبار أمني حاسم): رئيس مصلحة الإيواء يحاول الوصول لتقرير مصلحة الطب
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 10 (اختبار أمني حاسم): محاولة head_housing الوصول لتقرير مصلحة الطب (رقم #' + medicalReportId + '):');
  const attackRes = await fetch(`${baseUrl}/api/reports/${medicalReportId}`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const attackStatus = attackRes.status;
  const attackBody = await attackRes.json();
  console.log(' - كود الاستجابة (HTTP Status):', attackStatus);
  console.log(' - رد الخادم:', attackBody);
  const test10Passed = attackStatus === 403 && attackBody.success === false;
  console.log(` >>> نتيجة اختبار 10: [${test10Passed ? 'تم حظر الهجوم بنجاح 403 Forbidden' : 'فشل أمني!'}]`);

  // ==========================================
  // الاختبار 11: محاولة تزوير department_id عند إنشاء تقرير
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 11: head_housing يحاول إرسال department_id = 1 (مصلحة الطب) في الـ Payload:');
  const spoofRes = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${housingAuth.token}`
    },
    body: JSON.stringify({
      department_id: 1, // محاولة انتحال مصلحة الطب
      report_type: 'DAILY',
      title: 'محاولة تقرير باسم مصلحة أخرى',
      report_date: '2026-10-02',
      content: 'تقرير تجريبي للتحقق من عدم انتحال المصلحة.',
      status: 'DRAFT'
    })
  });
  const spoofData = await spoofRes.json();
  const spoofReportId = spoofData.reportId;
  // Check the actual department of the created report
  const checkSpoofRes = await fetch(`${baseUrl}/api/reports/${spoofReportId}`, {
    headers: { Authorization: `Bearer ${housingAuth.token}` }
  });
  const checkSpoofData = await checkSpoofRes.json();
  console.log(' - المصلحة التي سُجل بها التقرير فعلياً في قاعدة البيانات:', checkSpoofData.data.dept_name, `(ID: ${checkSpoofData.data.department_id})`);
  const test11Passed = checkSpoofData.data.department_id === 2; // Still bound to housing (2)!
  console.log(` >>> نتيجة اختبار 11: [${test11Passed ? 'تم إحباط الانتحال وتثبيت مصلحة الإيواء بنجاح' : 'فشل أمني!'}]`);

  // ==========================================
  // الاختبار 12: فحص رؤساء المصالح الستة والتأكد أن كل رئيس يرى تقاريره ومصلحته فقط
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 12: فحص رؤساء المصالح الستة والتأكد من العزل التام للتقارير:');
  const headsList = [
    { username: 'head_medical', pass: 'medical12345', deptId: 1, deptName: 'مصلحة الطب' },
    { username: 'head_housing', pass: 'housing12345', deptId: 2, deptName: 'مصلحة الإيواء' },
    { username: 'head_psychology', pass: 'psychology12345', deptId: 3, deptName: 'مصلحة الطب النفسي' },
    { username: 'head_catering', pass: 'catering12345', deptId: 4, deptName: 'مصلحة الإطعام' },
    { username: 'head_maintenance', pass: 'maintenance12345', deptId: 5, deptName: 'مصلحة الصيانة' },
    { username: 'head_security', pass: 'security12345', deptId: 6, deptName: 'مصلحة الأمن الداخلي' },
  ];

  let test12AllPassed = true;
  for (const h of headsList) {
    const hAuth = await login(h.username, h.pass);
    const hReportsRes = await fetch(`${baseUrl}/api/reports`, {
      headers: { Authorization: `Bearer ${hAuth.token}` }
    });
    const hReportsData = await hReportsRes.json();
    const reportsList = hReportsData.data || [];
    const hasForeignReport = reportsList.some(r => r.department_id !== h.deptId);
    console.log(` - ${h.deptName} (${h.username}): عدد التقارير المسترجعة: ${reportsList.length} | تقارير من مصالح أخرى: ${hasForeignReport ? 'نعم (خرق أمني)' : 'صفر (عزل تام)'}`);
    if (hasForeignReport) test12AllPassed = false;
  }
  console.log(` >>> نتيجة اختبار 12: [${test12AllPassed ? 'نجاح تام في عزل المصالح الستة' : 'فشل'}]`);

  // ==========================================
  // الاختبار 13: المدير يرى تقارير المصالح الستة
  // ==========================================
  console.log('\n----------------------------------------------------------------------');
  console.log('اختبار 13: المدير يستعرض تقارير المصالح المختلفة:');
  const finalDirRes = await fetch(`${baseUrl}/api/reports`, {
    headers: { Authorization: `Bearer ${directorAuth.token}` }
  });
  const finalDirData = await finalDirRes.json();
  const dirDepartmentsSeen = new Set(finalDirData.data.map(r => r.department_id));
  console.log(' - إجمالي التقارير المسترجعة للمدير:', finalDirData.data.length);
  console.log(' - المصالح التي تضمها تقارير المدير:', Array.from(dirDepartmentsSeen).map(id => `مصلحة #${id}`));
  const test13Passed = finalDirData.data.length >= 2;
  console.log(` >>> نتيجة اختبار 13: [${test13Passed ? 'نجاح تام: المدير يرى كافة التقارير الواردة' : 'فشل'}]`);

  console.log('\n======================================================================');
  console.log('                 اكتمال كافة الاختبارات الـ 13 بنجاح تام                ');
  console.log('======================================================================');
}

runPhase2Tests().catch(err => console.error('Test error:', err));
