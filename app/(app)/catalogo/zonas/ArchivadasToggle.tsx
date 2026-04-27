'use client'

import { useState } from 'react'

export default function ArchivadasToggle({
  count,
  children,
}: {
  count: number
  children: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="mt-12">
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-4"
      >
        <span>{abierto ? '▼' : '▶'}</span>
        <span>Archivadas ({count})</span>
      </button>

      {abierto && children}
    </div>
  )
}
