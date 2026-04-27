'use client'

const STEPS = [
  { n: 1, label: 'Datos y eventos' },
  { n: 2, label: 'Adicionales' },
  { n: 3, label: 'Ajustes' },
  { n: 4, label: 'Resumen' },
]

export default function Stepper({
  step,
  onStepChange,
  enabledSteps = [1],
}: {
  step: number
  onStepChange?: (n: number) => void
  enabledSteps?: number[]
}) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const habilitado = enabledSteps.includes(s.n)
        const completado = step > s.n
        const actual = step === s.n

        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-initial">
            <button
              type="button"
              onClick={() => habilitado && onStepChange?.(s.n)}
              disabled={!habilitado}
              className={`flex items-center gap-3 ${
                habilitado ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition flex-shrink-0 ${
                  actual
                    ? 'bg-stone-900 text-white'
                    : completado
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {completado ? '✓' : s.n}
              </div>
              <span
                className={`text-sm whitespace-nowrap ${
                  actual
                    ? 'text-stone-900 font-medium'
                    : 'text-stone-500'
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-4 ${
                  completado ? 'bg-amber-600' : 'bg-stone-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
