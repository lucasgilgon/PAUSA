/**
 * app/loading.tsx — Loading skeleton global de Next.js.
 * Se muestra durante la carga inicial de Server Components.
 */

export default function LoadingPage() {
  return (
    <div className="flex flex-col p-4 gap-3 max-w-app mx-auto">
      {/* Simula NextSessionCard */}
      <div className="skeleton h-36 rounded-xl" />
      {/* Simula StatsRow */}
      <div className="grid grid-cols-3 gap-2">
        <div className="skeleton h-16 rounded-lg" />
        <div className="skeleton h-16 rounded-lg" />
        <div className="skeleton h-16 rounded-lg" />
      </div>
      {/* Simula AgendaList */}
      <div className="skeleton h-4 w-24 rounded mt-2" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-border">
          <div className="skeleton h-3 w-10 rounded" />
          <div className="skeleton w-2 h-2 rounded-full" />
          <div className="skeleton h-3 flex-1 rounded" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
