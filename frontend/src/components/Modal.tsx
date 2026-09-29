import type { ReactNode } from 'react';

export default function Modal({
  judul,
  onTutup,
  children,
  lebar = 'max-w-lg',
}: {
  judul: string;
  onTutup: () => void;
  children: ReactNode;
  lebar?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onTutup}>
      <div className={`w-full ${lebar} rounded-xl bg-white shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-slate-800">{judul}</h3>
          <button onClick={onTutup} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="max-h-[75vh] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}
