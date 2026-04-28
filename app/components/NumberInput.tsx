'use client'

import { useState, useEffect } from 'react'

type NumberInputProps = {
  value: number
  onChange: (v: number) => void
  max?: number
  min?: number
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function NumberInput({
  value,
  onChange,
  max,
  min,
  placeholder,
  className,
  disabled,
}: NumberInputProps) {
  const [textoLocal, setTextoLocal] = useState(value === 0 ? '' : String(value))

  // Sincronizar cuando el valor externo cambia (ej. restaurar default)
  useEffect(() => {
    setTextoLocal(value === 0 ? '' : String(value))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    // Permitir vacío, dígitos y un punto decimal
    if (v === '' || /^\d*\.?\d*$/.test(v)) {
      setTextoLocal(v)
      const num = v === '' ? 0 : parseFloat(v)
      if (!isNaN(num)) {
        let final = num
        if (max !== undefined && final > max) final = max
        if (min !== undefined && final < min) final = min
        onChange(final)
      }
    }
  }

  function handleBlur() {
    if (textoLocal === '' || textoLocal === '.') {
      setTextoLocal(value === 0 ? '' : String(value))
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={textoLocal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}
