export default function BentoCard({ children, title, subtitle, className = "" }: any) {
  return (
    <div className={`bg-white rounded-[2rem] p-6 border border-slate-100 shadow-bento hover:shadow-indigo-500/5 transition-all duration-500 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
