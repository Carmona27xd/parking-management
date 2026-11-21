export async function parkingRequest<T>(path = '', body?: object): Promise<T> {
  const response = await fetch('/api/parking' + path, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail ?? 'No se pudo completar la solicitud. Intenta de nuevo.')
  }
  return response.json()
}
