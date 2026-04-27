'use client'

type NumberInputProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  placeholder?: string
  className?: string
  allowDecimal?: boolean
}

export default function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  placeholder = '0',
  className = '',
  allowDecimal = false,
}: NumberInputProps) {
  const pattern = allowDecimal ? /[^\d.]/g : /[^\d]/g

  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={value === 0 ? '' : value}
      onChange={(e) => {
        const cleaned = e.target.value.replace(pattern, '')
        if (cleaned === '' || cleaned === '.') {
          onChange(0)
          return
        }
        let n = Number(cleaned)
        if (isNaN(n)) {
          onChange(0)
          return
        }
        if (max !== undefined && n > max) n = max
        if (n < min) n = min
        onChange(n)
      }}
      placeholder={placeholder}
      className={className}
    />
  )
}
