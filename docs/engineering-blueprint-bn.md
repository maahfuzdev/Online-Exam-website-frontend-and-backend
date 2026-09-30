# অনলাইন পরীক্ষা প্ল্যাটফর্ম
## SRS, সিস্টেম নকশা ও ডেলিভারি পরিকল্পনা

**সংস্করণ:** 1.0 · **তারিখ:** ৩০ সেপ্টেম্বর ২০২৬  
**প্রযুক্তি:** Node.js, Express, MongoDB/Mongoose, EJS, Browser JavaScript  
**পাঠক:** Product owner, developer, QA, designer, deployment owner

> এটি বিদ্যমান কোড ও README-ভিত্তিক প্রাথমিক engineering baseline। বাস্তবায়িত ফিচার এবং সুপারিশ আলাদা করে দেখানো হয়েছে। এটি production audit বা আইনি মতামত নয়।

## ১. নথির অবস্থা ও পণ্য লক্ষ্য

রিপোজিটরিতে teacher/student role, পরীক্ষা তৈরি ও বরাদ্দ, MCQ স্কোরিং, লিখিত উত্তরের ফাইল আপলোড ও শিক্ষক-গ্রেডিং, ফলাফল এবং PDF/image থেকে AI-সহায়তায় প্রশ্ন প্রস্তাব তৈরির কোডের চিহ্ন রয়েছে। প্রতিটি আচরণ production-ready বলে ধরে নেওয়া হয়নি।

**লক্ষ্য:** শিক্ষক প্রশ্ন তৈরি করে নির্দিষ্ট শিক্ষার্থীকে সময়বদ্ধ পরীক্ষা দিতে পারবেন; শিক্ষার্থী পরীক্ষা দিয়ে অনুমোদিত ফল ও ইতিহাস দেখবে; শিক্ষক লিখিত উত্তর মূল্যায়ন ও ফলাফল পর্যালোচনা করবেন।

**এই baseline-এ:** teacher/student অভিজ্ঞতা; session sign-in; MCQ ও লিখিত প্রশ্ন; AI-assisted question draft; পরীক্ষা/সময়/নম্বর/negative marking/retake/result policy; submission, scoring, grading, ফলাফল ও analytics/export।

**আলাদা scope:** live proctoring, AI cheating detection, payment, LMS integration, native mobile app, high-stakes identity verification ও multi-tenant isolation—বর্তমান সক্ষমতা নয়। আলাদা discovery দরকার।

## ২. ব্যবহারকারী ও প্রধান workflow

| ভূমিকা | প্রয়োজন ও অনুমতি | সাফল্যের লক্ষণ |
|---|---|---|
| শিক্ষার্থী | নিজের বরাদ্দ পরীক্ষা, সময়ের মধ্যে উত্তর/ফাইল জমা, অনুমোদিত ফল দেখা | attempt সঠিক শিক্ষার্থীর সঙ্গে যুক্ত; timeout নীতি মানা |
| শিক্ষক | প্রশ্ন তৈরি, পরীক্ষা বরাদ্দ, ফল পর্যালোচনা, লিখিত নম্বর/feedback, ফল প্রকাশ | শুধু নিজের পরীক্ষার ডেটা নিয়ন্ত্রণ; প্রকাশ নীতি মানা |
| অপারেটর (প্রস্তাবিত) | secret, backup, monitoring, incident পরিচালনা | সেবা পুনরুদ্ধারযোগ্য ও গোপন তথ্য সুরক্ষিত |

1. **প্রস্তুতি:** শিক্ষক sign-in → প্রশ্ন তৈরি/import → AI প্রস্তাব যাচাই ও সম্পাদনা → পরীক্ষা/সময়/নম্বর নির্ধারণ → শিক্ষার্থী বরাদ্দ।
2. **পরীক্ষা:** শিক্ষার্থী sign-in → বরাদ্দ ও সময় যাচাই → attempt → উত্তর/ফাইল সংরক্ষণ → submit/timeout → server-এ ফল তৈরি।
3. **লিখিত মূল্যায়ন:** শিক্ষক pending উত্তর পর্যালোচনা → নম্বর/feedback → score পুনর্গণনা → ফল প্রকাশ।
4. **পর্যালোচনা:** শিক্ষক ফল filter/export ও analytics; শিক্ষার্থী শুধু নিজের অনুমোদিত ফল দেখে।

## ৩. SRS — কার্যকরী চাহিদা

অগ্রাধিকার: **M** আবশ্যক, **S** গুরুত্বপূর্ণ, **C** পরবর্তী/ঐচ্ছিক।

| ID | চাহিদা | অগ্রাধিকার | যাচাইযোগ্য ফল |
|---|---|---:|---|
| FR-01 | নিবন্ধন/লগইন; password hash; role server session থেকে | M | raw password নেই; invalid login প্রত্যাখ্যাত |
| FR-02 | Teacher-only route-এ server-side role ও ownership check | M | student direct API call-এ teacher action করতে পারে না |
| FR-03 | শিক্ষক MCQ ও লিখিত প্রশ্ন তৈরি/সম্পাদনা করবেন | M | প্রশ্নের মালিকানা ও input validation কার্যকর |
| FR-04 | পরীক্ষা, সময়, নম্বর, negative marking, retake, ফলনীতি নির্ধারণ | M | অবৈধ মান প্রত্যাখ্যাত; total marks মেলে |
| FR-05 | শিক্ষার্থী শুধু নিজের বরাদ্দ পরীক্ষা নির্ধারিত সময়ে শুরু করবে | M | অন্য ID/বন্ধ সময় দিয়ে access ব্যর্থ |
| FR-06 | attempt উত্তর server-এ সংরক্ষণ; retry/timeout/duplicate নিয়ম | M | একই attempt-এ duplicate result তৈরি হয় না |
| FR-07 | MCQ score/skip/negative mark server হিসাব করবে | M | answer key pre-submit student response-এ নেই |
| FR-08 | লিখিত ফাইল সীমাবদ্ধ MIME/size-এ জমা; শিক্ষক নম্বর দেবেন | S | অনুমোদিত file; নম্বর সর্বোচ্চ সীমা অতিক্রম করে না |
| FR-09 | ফল তাৎক্ষণিক/পরীক্ষা শেষে/শিক্ষক প্রকাশ নীতি মানবে | M | অপ্রকাশিত ফল student endpoint-এ অনুপস্থিত |
| FR-10 | শিক্ষার্থী নিজের ফল/ইতিহাস, শিক্ষক নিজের পরীক্ষার ফল দেখবেন | M | অন্য student/teacher ID দিয়ে access নিষিদ্ধ |
| FR-11 | শিক্ষক ফল filter করে PDF/Excel export করবেন | S | export ও filtered list মেলে; data scope ঠিক |
| FR-12 | AI প্রশ্ন প্রস্তাব দেবে; শিক্ষক যাচাইয়ের আগে সংরক্ষণ/প্রকাশ নয় | S | ফল draft; provider key server-side |
| FR-13 | retake policy অনুযায়ী attempt number ও concurrency নিয়ন্ত্রণ | M | সমান্তরাল request-এ unique attempt বজায় |
| FR-14 | গুরুত্বপূর্ণ publish/grade পরিবর্তনে audit event | S | actor/time/entity জানা যায়; secret log হয় না |

## ৪. SRS — গুণগত ও সীমাবদ্ধতার চাহিদা

| ID | চাহিদা | প্রস্তাবিত acceptance target |
|---|---|---|
| NFR-01 Performance | API ও dashboard দ্রুত; peak exam load সামলানো | নির্ধারিত load-এ p95 ≤ 500ms (AI/file বাদে); concurrency owner ঠিক করবেন |
| NFR-02 Availability | monitoring ও পুনরুদ্ধার | uptime target, health check, alert ও incident contact অনুমোদিত |
| NFR-03 Security | auth, authorization, validation, session/file নিরাপত্তা | প্রতিটি route-এ ownership check; secret repo/log-এ নয় |
| NFR-04 Privacy | data minimization, retention, deletion | privacy notice ও retention policy launch-এর আগে অনুমোদিত |
| NFR-05 Integrity | duplicate/tamper প্রতিরোধ | idempotent submission, unique index, atomic update |
| NFR-06 Accessibility | keyboard, label, contrast, screen reader | WCAG 2.2 AA লক্ষ্য; exam workflow manual review |
| NFR-07 Compatibility | browser ও mobile support | Chrome/Edge/Firefox বর্তমান ও আগের major version যাচাই |
| NFR-08 Maintainability | modular code, API contract, consistent errors | business rule service-এ; API schema নথিভুক্ত |
| NFR-09 Recovery | backup ও পুনরুদ্ধার অনুশীলন | RPO/RTO নির্ধারিত; encrypted backup restore rehearsal |

সংখ্যাগত লক্ষ্যগুলো প্রস্তাব, production SLA নয়। বাস্তব traffic ও ব্যবসায়িক চাহিদা অনুযায়ী অনুমোদন করতে হবে।

## ৫. System architecture ও data model

```text
Browser (EJS + static JS/CSS)
  └─ HTTPS/session → Express → auth/role middleware → routes/controllers
                                             → services (business rules)
                                             → repositories/Mongoose → MongoDB
External: Gemini API (শুধু AI question suggestions)
```

বর্তমান backend modular Express/Mongoose layout ব্যবহার করে। অনুমতি, timer, scoring, result visibility ও ownership server-এ enforce করতে হবে। DB startup failure স্পষ্টভাবে সামলাতে হবে।

| Entity | মূল তথ্য/সম্পর্ক | নকশা বিষয় |
|---|---|---|
| User (Auth) | name, normalized email, passwordHash, role, class | service hash করে কি না, role escalation বন্ধ কি না যাচাই |
| Question | teacher owner, prompt, type, options/key, subject | answer key student response-এ ফেরত নয়; CRUD-এ ownership |
| Exam (AssignedQuestion) | teacher, students, questions, schedule, marks, policies | publish-এর পর question edit/version snapshot নীতি স্থির |
| Attempt/Result | exam, student, attempt no., timing, answers, score/state | idempotency ও unique (exam,student,attempt); source of truth ঠিক করা |
| WrittenAnswer | exam/student/question/attempt, file metadata/data | size, malware scan, access, retention; object storage বিবেচনা |
| AuditEvent (প্রস্তাব) | actor, action, entity ID, timestamp, request ID | password, key, file data, session secret log নয় |

**কোড পর্যালোচনার যাচাই:** Submission schema-র student reference model ও answer type প্রশ্ন-প্রবাহের সঙ্গে সামঞ্জস্যপূর্ণ কি না দেখুন। legacy Submission বনাম Result/Attempt-এর source of truth একক করুন।

### API capability ও access policy

| Capability | Access | আবশ্যিক নিয়ম |
|---|---|---|
| Authentication | public/নিজস্ব session | normalized email, rate limit, secure cookie, CSRF strategy |
| Question CRUD / OCR generate | teacher + owner | AI output validation, upload limit, timeout |
| Exam assign/list/start | teacher owner / বরাদ্দ student | schedule, duration, retake ও scope যাচাই |
| Answer submit / file upload | attempt owner | server clock, idempotency, exam window, size/MIME |
| Results / grade / release / export | teacher owner বা অনুমোদিত student | প্রত্যেক endpoint-এ visibility policy |

OpenAPI-তে প্রকৃত path/method/schema/status code route/controller থেকে যাচাই করে নথিভুক্ত করুন।

## ৬. Security, privacy ও reliability

- **Access:** authenticated session ID-কে actor হিসেবে ব্যবহার; client পাঠানো ID বিশ্বাস নয়; প্রতিটি object read/write-এ authorization।
- **Session/secrets:** production-এ random `SESSION_SECRET`, HTTPS, Secure/HttpOnly/SameSite cookie, logout invalidation, login rate limit; `.env` Git-এ নয়; provider key শুধু server-এ।
- **Exam integrity:** server clock authoritative; answer key pre-submit response-এ নয়; schedule/duration/retake যাচাই; duplicate submit atomically ঠেকানো।
- **File/input:** schema validation, size cap, MIME sniffing, safe filename/download headers, malware scan বা isolated storage বিবেচনা।
- **Web:** session-based state-changing route-এ CSRF defense; XSS/security header review; CSV/Excel formula injection ঠেকানো।
- **Privacy:** সর্বনিম্ন data, export audit, retention/deletion, privacy notice; AI provider-এ document পাঠানোর সম্মতি ও retention যাচাই।
- **Operations:** redacted structured log, request ID, alert, encrypted backup, restore rehearsal, incident runbook।

**Edge case:** submit বনাম timeout race-এর নির্ধারিত outcome; retry-তে duplicate ফল নয়; refresh/network বিচ্ছিন্নতায় উত্তর হারানোর নীতি; পরীক্ষা চলাকালে প্রশ্ন বদলালে attempt snapshot; upload সফল কিন্তু submit ব্যর্থ হলে পুনরুদ্ধার।

## ৭. QA ও release acceptance

এই PDF তৈরির সময় কোনো test চালানো হয়নি। release pipeline-এ যোগ করার QA স্তর:

| স্তর | যাচাই |
|---|---|
| Unit | score/negative marking/skip, visibility, validation, grade boundary, file policy |
| Integration | Mongo repository, session/role/owner checks, unique index/idempotency |
| End-to-end | teacher create→assign→student attempt→submit→grade/release→student view |
| Security | unauthenticated access, IDOR, privilege escalation, CSRF/XSS, brute force, file abuse |
| Load/recovery | concurrent start/submit, DB restart, backup restore, provider failure |
| Accessibility | keyboard-only exam, mobile, error message, focus ও contrast |

**Acceptance criteria:** (1) সব FR-M-এর reproducible pass evidence; (2) student অন্যের ফল/উত্তর, answer key বা unpublished result পড়তে পারে না; teacher অন্য teacher-এর exam বদলাতে পারে না; (3) timer, score, retake, visibility server-authoritative; duplicate result নেই; (4) secure production config, backup/rollback যাচাই; (5) known issue, browser support, retention, incident owner নথিভুক্ত।

## ৮. কোম্পানির সাধারণ engineering flow ও delivery plan

| ধাপ | সাধারণ কাজ | এই প্রকল্পের deliverable / gate |
|---|---|---|
| ০ Discovery | stakeholder, persona, scope, constraint, risk | concurrency, hosting, privacy, exam policy-তে product owner সিদ্ধান্ত |
| ১ Specification | SRS, acceptance, workflow, API/data contract | FR অনুমোদন; ambiguous policy নির্ধারণ |
| ২ UX/Architecture | wireframe, threat model, data flow, ADR | start/submit/error/grade flow; file/retention design |
| ৩ Build | vertical slice, code review, migration/config | auth → question/exam → attempt/scoring → grading/results |
| ৪ Verify | automated QA, security/accessibility/load | acceptance evidence ও issue list |
| ৫ Release | staging UAT, backup, rollout/rollback | deployment checklist, monitoring, restore proof, owner |
| ৬ Operate | monitor, incident, feedback, patch | latency/error/submit metrics; access ও backup review |

**প্রস্তাবিত practice:** issue-তে user story ও acceptance criteria; ছোট PR ও review; dev→staging→production; CI-তে lint, automated tests ও dependency/security scan; গুরুত্বপূর্ণ সিদ্ধান্তে ADR; release-এর আগে backup, rollback ও migration plan।

## ৯. ঝুঁকি ও নির্ভরতা

| ঝুঁকি | প্রভাব | প্রতিকার |
|---|---|---|
| client timer/role বিশ্বাস | সময় manipulation, অননুমোদিত data | server-side authorization/time; direct API security test |
| concurrent submit/retake race | duplicate বা ভুল ফল | unique index, atomic transition, idempotency |
| key/student data response-এ ফাঁস | পরীক্ষা ও privacy লঙ্ঘন | allowlist DTO, role-aware serialization, leakage check |
| বড়/ক্ষতিকর file | storage/availability/security ক্ষতি | size/MIME cap, scan, isolated storage, retention |
| AI ভুল প্রশ্ন | অন্যায্য পরীক্ষা | teacher review বাধ্যতামূলক; auto-publish নয় |
| backup/restore যাচাই নেই | স্থায়ী data loss | encrypted backup ও নিয়মিত restore drill |

নির্ভরতা: MongoDB/hosting/TLS, Gemini API (শুধু AI import), browser support, domain/email (যদি verification যোগ হয়)। Provider outage-এ manual question flow চলবে কি না product decision।

## १०. Product owner-ээс দরকারি সিদ্ধান্ত

| সিদ্ধান্ত | কেন দরকার | Owner |
|---|---|---|
| target user ও peak concurrent examinee | hosting ও load target | Product owner |
| exam window বনাম per-attempt timer precedence | timeout enforcement | Product + engineering |
| autosave/reconnect আচরণ | fairness ও data loss | Product + engineering |
| written grading pending অবস্থায় student কী দেখবে | result/privacy policy | Academic owner |
| file type/size এবং DB বনাম object storage | security/cost/backup | Engineering + operations |
| retention/deletion এবং প্রযোজ্য privacy rule | privacy compliance | Product + privacy reviewer |
| teacher account/role কে approve করবে | privilege escalation | Product + security |

### প্রথম বাস্তব পদক্ষেপ

1. উপরের সিদ্ধান্তগুলোর owner/উত্তর সংগ্রহ করে SRS v1.1 অনুমোদন।
2. routes/controllers-কে FR ও API contract-এর সঙ্গে মিলিয়ে gap list।
3. object-level authorization, score/attempt idempotency, file limits, result visibility-র blocker সমাধান।
4. automated QA, CI, backup/restore ও deployment runbook; তারপর staging UAT।

## পরিশিষ্ট — পরিভাষা ও উৎস

| শব্দ | অর্থ |
|---|---|
| SRS | Software Requirements Specification — পরীক্ষাযোগ্য system requirement |
| FR / NFR | Functional / Non-functional Requirement — feature আচরণ / গুণগত শর্ত |
| RBAC | Role-Based Access Control; সঙ্গে record ownership check |
| Idempotency | একই retry-তে business operation একবারের বেশি না হওয়া |
| RPO / RTO | গ্রহণযোগ্য data loss window / recovery target time |
| ADR | Architecture Decision Record — নকশা-সিদ্ধান্তের কারণ |

প্রস্তুত করা হয়েছে repository README, Express routes/controllers/services এবং Mongoose schema-র দৃশ্যমান তথ্য থেকে। এই নথি engineering planning artifact; আইনি মতামত, security certification বা সম্পূর্ণ code audit নয়।
