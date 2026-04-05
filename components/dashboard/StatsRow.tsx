/**
 * components/dashboard/StatsRow.tsx
 * Fila de 3 métricas del mes: sesiones, pacientes activos, horas ahorradas.
 */

interface StatsRowProps {
  monthSessions:  number;
  activePatients: number;
  hoursSaved:     number;
}

export function StatsRow({ monthSessions, activePatients, hoursSaved }: StatsRowProps) {
  const stats = [
    { value: String(monthSessions),  label: "Sesiones este mes",    color: "text-primary"   },
    { value: String(activePatients), label: "Pacientes activos",    color: "text-primary"   },
    { value: `${hoursSaved}h`,       label: "Tiempo ahorrado con IA", color: "text-secondary" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mx-4 mt-3">
      {stats.map(({ value, label, color }) => (
        <div
          key={label}
          className="bg-surface-secondary border border-border rounded-lg
                     px-2 py-3 text-center"
        >
          <p className={`font-headline text-2xl font-extrabold ${color}`}>
            {value}
          </p>
          <p className="text-2xs text-text-tertiary mt-0.5 leading-tight">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
