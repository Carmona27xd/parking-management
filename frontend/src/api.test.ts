import { afterEach, describe, expect, it, vi } from 'vitest'
import { parkingRequest } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('parkingRequest', () => {
  it('envía la placa como JSON y devuelve la estancia', async () => {
    const stay = { id: 1, plate: 'ABC123' }
    const fetchMock = vi.fn().mockResolvedValue(Response.json(stay, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(parkingRequest('/stays', { plate: 'ABC-123' })).resolves.toEqual(stay)
    expect(fetchMock).toHaveBeenCalledWith('/api/parking/stays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plate: 'ABC-123' }),
    })
  })

  it('propaga el detalle de un conflicto devuelto por la API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      Response.json({ detail: 'La placa ya está dentro.' }, { status: 409 }),
    ))
    await expect(parkingRequest()).rejects.toThrow('La placa ya está dentro.')
  })

  it('muestra un mensaje si el proxy devuelve una respuesta sin JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })))
    await expect(parkingRequest()).rejects.toThrow('No se pudo completar la solicitud.')
  })
})
