# تعليمات لأي أداة ذكاء اصطناعي تعمل على هذا المشروع

1. اقرأ SALSABIL_CONSTITUTION.md بالكامل أولاً قبل أي كود.
2. لا تُعدّل نطاقات موجودة دون تبرير مكتوب.
3. لا تكرر منطق التسعير أو الأعمال في أكثر من مكان.
4. كل حساب سعر أو تحقق مخزون يتم على الخادم فقط، أبداً في الواجهة.
5. لا استدعاء مباشر لقاعدة البيانات من أي مكون واجهة.
6. أي مهمة تمر بالدورة: Specification → Plan → Review → Implementation → Tests → Review → Commit.
7. لا تنشئ ملفات لا لزوم لها. الحد الأدنى من الكود لتحقيق المطلوب فقط.
8. عند الشك في القرار المعماري، توقف واسأل، لا تخمّن.
9. القواعد 3-5 أعلاه مفروضة الآن آلياً عبر خطافات Git (Husky) وdependency-cruiser — راجع `.husky/pre-commit`، `.husky/pre-push`، `.dependency-cruiser.cjs`، و`docs/ARCHITECTURE.md §3.1`. **لا تتجاوز هذه الخطافات بـ`git commit --no-verify` أو `git push --no-verify` إلا بطلب صريح من المؤسس في نفس المحادثة** — فشل خطاف يعني وجود مشكلة حقيقية يجب حلها، لا تجاوزها.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
