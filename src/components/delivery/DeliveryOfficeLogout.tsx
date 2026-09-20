import { logoutDeliveryAction } from '@/app/delivery/logout/actions';

export function DeliveryOfficeLogout() {
  return (
    <form action={logoutDeliveryAction}>
      <button type="submit" className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted">
        تسجيل الخروج
      </button>
    </form>
  );
}
