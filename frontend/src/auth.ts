export interface SessionUser {
  username: string
  roles: string[]
}

export async function currentUser(): Promise<SessionUser | null> {
  const response = await fetch('/api/auth/me')
  if (response.status === 401) return null
  if (!response.ok) throw new Error('No se pudo consultar la sesión.')
  return response.json()
}

async function csrfHeaders(): Promise<Record<string, string>> {
  const response = await fetch('/api/auth/csrf')
  if (!response.ok) throw new Error('No se pudo preparar la solicitud. Intenta de nuevo.')
  const { headerName, token } = await response.json()
  return { [headerName]: token }
}

export async function signIn(username: string, password: string): Promise<SessionUser> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: await csrfHeaders(),
    body: new URLSearchParams({ username, password }),
  })
  if (response.status === 401) throw new Error('Usuario o contraseña incorrectos.')
  if (!response.ok) throw new Error('No se pudo iniciar sesión. Intenta de nuevo.')

  const user = await currentUser()
  if (!user) throw new Error('No se pudo confirmar el inicio de sesión.')
  return user
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: await csrfHeaders(),
  })
  if (!response.ok) throw new Error('No se pudo cerrar sesión. Intenta de nuevo.')
}
