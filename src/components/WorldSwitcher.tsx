'use client';
// src/components/WorldSwitcher.tsx
// مبدّل العوالم الحقيقي (اليوم 29، BAYAN-HOME-FEED-001) — يستبدل زر Globe الوهمي في FeedTopBar
// (اليوم 26، "قريباً" ثابت). يقرأ worlds الحقيقية عبر listActiveWorldsAction (تمريرة لـ
// khalilService.listActiveWorlds()، الأيام 20/23) — عدد الدوائر المعروضة ديناميكي بالكامل تبعاً
// لعدد الصفوف النشطة فعلياً في القاعدة، بلا Hardcode لعدده.
//
// ⚠️ World هنا (خليل، Context Engine) مختلف تماماً عن WorldSlug/WORLD_THEMES البصري
// (src/config/theme-registry.ts، ADR-007) — نفس التمييز الموثَّق في bayan/types.ts. هذا المكوّن لا
// يغيّر data-world البصري إطلاقاً؛ صفحة الخلاصة تبقى data-world="reef" كما هي.
//
// FUNCTIONAL_WORLD_SLUGS: العوالم المفعَّلة وظيفياً اليوم فعلياً (تنقّل حقيقي/محتوى مخصَّص) —
// "individuals" فقط، وهو العالم الحالي أصلاً فالنقر عليه يُغلِق الواجهة بلا أي تنقل حقيقي. أي صف
// آخر تُعيده listActiveWorldsAction مستقبلاً (لم يُزرَع أي صف جديد في هذه المهمة) يُعرَض تلقائياً
// معطَّلاً + توست "قريباً" بلا أي تعديل على هذا الملف — التمييز بالسماحية (FUNCTIONAL_WORLD_SLUGS)
// لا بوجود الصف نفسه، لأن "نشط في القاعدة" و"جاهز وظيفياً في الواجهة" أمران مختلفان عمداً.
//
// الطبقة العلوية (overlay+toast) تُصيَّر عبر createPortal إلى document.body — نفس إصلاح
// BottomSheet.tsx في هذا اليوم بالضبط: زر التبديل نفسه يعيش داخل ScrollHideBar (اليوم 28)، الذي
// يحمل خاصية transform فينشئ "containing block" جديداً لـ position:fixed لو بقيت الطبقة العلوية
// في نفس الشجرة — اكتُشف هذا فعلياً أثناء بناء هذا المكوّن نفسه (لقطة شاشة حية أظهرت الواجهة
// منحصرة داخل حدود الشريط العلوي بدل تغطية الشاشة).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Blend } from 'lucide-react';
import { listActiveWorldsAction } from '@/app/(reef)/feed-actions';
import type { World } from '@/core/kernel/khalil/types';

const FUNCTIONAL_WORLD_SLUGS = ['individuals'];
const ANIMATION_MS = 300;
const TOAST_DURATION_MS = 2000;

export function WorldSwitcher() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false); // يتحكم بحالة الانتقال (enter/exit) بعد التركيب
  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setMounted(true), []);
  useEffect(() => () => clearTimeout(closeTimeoutRef.current), []);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSwitcher();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function openSwitcher() {
    setOpen(true);
    setWorlds(null);
    listActiveWorldsAction().then(setWorlds);
    // إطاران متتاليان (لا واحد) لضمان أن المتصفح رسم الحالة الابتدائية (مخفية) فعلياً قبل الانتقال
    // للحالة الظاهرة — بدونهما قد يُدمَج التغييران في رسمة واحدة فلا يظهر أي انتقال بصري.
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function closeSwitcher() {
    setVisible(false);
    closeTimeoutRef.current = setTimeout(() => setOpen(false), ANIMATION_MS);
  }

  function showComingSoonToast() {
    setToast('قريباً');
    setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  function handleWorldClick(world: World) {
    if (FUNCTIONAL_WORLD_SLUGS.includes(world.slug)) {
      closeSwitcher(); // العالم الحالي أصلاً — لا تنقل فعلي مطلوب اليوم
    } else {
      showComingSoonToast();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSwitcher}
        aria-label="تبديل العالم"
        className="flex shrink-0 items-center justify-center rounded-full border border-border p-2 text-foreground transition hover:bg-muted"
      >
        <Blend size={20} />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <button
              type="button"
              aria-label="إغلاق"
              onClick={closeSwitcher}
              className={`absolute inset-0 bg-foreground/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
            />

            <div
              className={`relative flex w-full max-w-md flex-col gap-6 rounded-t-2xl border-t border-border bg-card p-6 shadow-xl transition-all duration-300 sm:rounded-2xl sm:border ${
                visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-95 opacity-0'
              }`}
            >
              <h2 className="text-center text-lg font-medium text-card-foreground">اختر عالمك</h2>

              {worlds === null ? (
                <p className="py-6 text-center text-muted-foreground">جارٍ التحميل...</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-5">
                  {worlds.map((world, index) => {
                    const enabled = FUNCTIONAL_WORLD_SLUGS.includes(world.slug);
                    return (
                      <button
                        key={world.id}
                        type="button"
                        onClick={() => handleWorldClick(world)}
                        style={{ transitionDelay: visible ? `${index * 60}ms` : '0ms' }}
                        className={`flex w-20 flex-col items-center gap-2 transition-all duration-300 ${
                          visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                        }`}
                      >
                        <span
                          className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-lg font-semibold ${
                            enabled ? 'border-primary bg-muted text-primary' : 'border-border bg-muted text-muted-foreground opacity-60'
                          }`}
                        >
                          {world.name.charAt(0)}
                        </span>
                        <span className={`truncate text-xs ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {world.name}
                        </span>
                        {!enabled && <span className="text-[10px] text-muted-foreground">قريباً</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {toast &&
        mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
            <span className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">{toast}</span>
          </div>,
          document.body
        )}
    </>
  );
}
