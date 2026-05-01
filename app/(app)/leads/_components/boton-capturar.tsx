'use client'

import { useState } from 'react'
import CapturaModal from './captura-modal'

export default function BotonCapturar() {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 rounded-lg transition font-medium flex-shrink-0"
      >
        + Capturar lead
      </button>
      <CapturaModal abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  )
}
