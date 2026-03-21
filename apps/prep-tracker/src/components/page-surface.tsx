import type { ReactNode } from "react";

type PageSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function PageSurface({ children, className = "" }: PageSurfaceProps) {
  return (
    <div
      className={`mx-auto rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.28),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 text-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
