'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-stone-600 hover:text-stone-900 border border-stone-300 px-4 py-2 rounded-lg hover:bg-stone-100 transition"
    >
      Cerrar sesión
    </button>
  )
}
