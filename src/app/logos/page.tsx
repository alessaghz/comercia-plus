'use client';

export default function LogosPreview() {
  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Selector de Identidad Visual — ComercIA+
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Compara las 3 propuestas vectoriales (SVG) sobre la interfaz real y dime cuál elegimos.
          </p>
        </div>

        {/* OPCIÓN A */}
        <div className="rounded-2xl border border-blue-500/30 bg-[#0B1120] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-cyan-400/30 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" stroke="#38BDF8" strokeWidth="1.75" strokeLinejoin="round"/>
                  <path d="M12 22V12M12 12L20.66 7M12 12L3.34 7" stroke="#2563EB" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="2.5" fill="#38BDF8"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xl font-bold tracking-tight text-white">
                  Comerc<span className="text-cyan-400">IA</span>
                  <span className="text-blue-500 font-extrabold">+</span>
                </div>
                <p className="text-xs text-slate-400">Copiloto de Cumplimiento Aduanero & LIGIE</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-cyan-300 border border-cyan-500/20">
              Opción A · Nexus Aduanal
            </span>
          </div>
          <p className="text-xs text-slate-400">
            <strong className="text-slate-200">Paleta:</strong> Azul Cobalto & Cian Eléctrico sobre Azul Profundo. Proyecta precisión técnica, estructura logística y rigor institucional.
          </p>
        </div>

        {/* OPCIÓN B */}
        <div className="rounded-2xl border border-amber-500/30 bg-[#0D0D10] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-600/5 border border-amber-400/30 shadow-[0_0_20px_rgba(212,175,55,0.12)]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="#D4AF37" strokeWidth="1.5" strokeOpacity="0.5"/>
                  <path d="M15.5 8.5C14.5 7.5 13.3 7 12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C13.3 17 14.5 16.5 15.5 15.5" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M13 12H18M18 12L15.5 9.5M18 12L15.5 14.5" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xl font-bold tracking-tight text-white">
                  Comerc<span className="text-amber-400">IA</span>
                  <span className="text-zinc-400 font-light">+</span>
                </div>
                <p className="text-xs text-zinc-400">Copiloto de Cumplimiento Aduanero & LIGIE</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
              Opción B · Vector LIGIE
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            <strong className="text-zinc-200">Paleta:</strong> Dorado Champagne & Blanco Platino sobre Negro Obsidiana. Estética sobria de firma ejecutiva de comercio exterior.
          </p>
        </div>

        {/* OPCIÓN C */}
        <div className="rounded-2xl border border-indigo-500/30 bg-[#0B0F1A] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 border border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.18)]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="3 3"/>
                  <path d="M12 6.5L17 15.5H7L12 6.5Z" stroke="#C084FC" strokeWidth="1.6" strokeLinejoin="round"/>
                  <circle cx="12" cy="6.5" r="1.8" fill="#E0E7FF"/>
                  <circle cx="17" cy="15.5" r="1.8" fill="#818CF8"/>
                  <circle cx="7" cy="15.5" r="1.8" fill="#C084FC"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xl font-bold tracking-tight text-white">
                  Comerc<span className="text-indigo-400">IA</span>
                  <span className="text-purple-400 font-extrabold">+</span>
                </div>
                <p className="text-xs text-slate-400">Copiloto de Cumplimiento Aduanero & LIGIE</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
              Opción C · Prisma Global
            </span>
          </div>
          <p className="text-xs text-slate-400">
            <strong className="text-slate-200">Paleta:</strong> Índigo & Violeta Suave sobre Azul Medianoche. Estilo moderno de plataforma SaaS de inteligencia artificial.
          </p>
        </div>
      </div>
    </div>
  );
}
