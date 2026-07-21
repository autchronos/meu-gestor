export default function Carregando() {
  return (
    <div className="mx-auto flex max-w-3xl animate-pulse flex-col gap-4 px-4 py-6">
      <div className="h-8 w-40 border border-borda bg-superficie" />
      <div className="h-24 border border-borda bg-superficie" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 border border-borda bg-superficie" />
        <div className="h-20 border border-borda bg-superficie" />
      </div>
      <div className="h-40 border border-borda bg-superficie" />
      <p className="text-center text-xs uppercase tracking-wider text-texto-suave">Carregando…</p>
    </div>
  );
}
