"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Check, ShieldCheck, Sparkles, X } from "lucide-react";

export function ScrollTopActions() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const update = () => setVisible((window.scrollY || document.documentElement.scrollTop) > 100);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("pageshow", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("pageshow", update);
    };
  }, []);

  const goBack = () => {
    const referrer = document.referrer;
    if (window.history.length > 1 && referrer && new URL(referrer).origin === window.location.origin) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <div
        className={`scroll-top-actions fixed inset-x-0 z-[180] flex items-center justify-between px-4 sm:px-6 pointer-events-none transition-all duration-300 ${visible ? "is-visible" : "is-hidden"}`}
        aria-hidden={!visible}
      >
        <button type="button" onClick={goBack} tabIndex={visible ? 0 : -1} aria-label="Trở về" className="scroll-top-action-button pointer-events-auto">
          <ArrowLeft size={19} strokeWidth={2.1} />
          <span>Trở về</span>
        </button>
        <button type="button" onClick={() => setNotificationsOpen(true)} tabIndex={visible ? 0 : -1} aria-label="Thông báo" className="scroll-top-action-button scroll-top-notification pointer-events-auto">
          <Bell size={18} strokeWidth={2} />
          <span>Thông báo</span>
          <i aria-hidden="true" />
        </button>
      </div>

      {notificationsOpen && typeof document !== "undefined" && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="scroll-notification-title" className="scroll-notification-overlay fixed inset-0 z-[220] flex flex-col">
          <header className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
            <h2 id="scroll-notification-title" className="text-base font-bold text-white">Thông báo</h2>
            <button type="button" onClick={() => setNotificationsOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-white/75" aria-label="Đóng">
              <X size={20} />
            </button>
          </header>
          <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8">
            <div className="scroll-notification-card relative w-full max-w-[390px] overflow-hidden rounded-[30px] px-6 pb-8 pt-9 text-center sm:px-8">
              <div className="scroll-notification-orbit" aria-hidden="true" />
              <div className="scroll-notification-icon relative mx-auto mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-[26px]">
                <ShieldCheck size={38} strokeWidth={1.65} />
                <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#b79aff] to-[#7550c8] text-white shadow-lg"><Sparkles size={15} /></span>
              </div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.28em] text-violet-200/75">Cam kết trải nghiệm</p>
              <h3 className="text-[29px] font-extrabold leading-[1.12] tracking-[-.045em] text-white sm:text-[34px]">
                Xem phim trọn vẹn.
                <span className="block scroll-notification-gradient-text">Không quảng cáo.</span>
              </h3>
              <p className="mx-auto mt-4 max-w-[290px] text-[13px] leading-6 text-white/65">
                Website sẽ không bao giờ có quảng cáo. Tận hưởng phim yêu thích liền mạch, không bị làm phiền.
              </p>
              <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="flex flex-col gap-3 text-left">
                {["Không banner quảng cáo", "Không pop-up làm phiền", "Không quảng cáo chen giữa phim"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-[12px] font-medium text-white/80">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400/15 text-violet-200"><Check size={13} strokeWidth={2.5} /></span>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-7 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-violet-200/65">
                <Sparkles size={13} /> Trải nghiệm giải trí thuần túy
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
