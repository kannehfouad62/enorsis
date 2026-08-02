export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5">
    <div className="logo-orbit"><span /></div>
    {!compact && <div className="text-[27px] font-black tracking-[-0.04em] text-[#082968]">enorsis</div>}
  </div>;
}
