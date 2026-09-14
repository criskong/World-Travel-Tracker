import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTravelStore } from './travelStore'
import { closeDatabase } from '../services/storage/db'
import { loadPhoto, loadVisits } from '../services/storage'

/**
 * Modifica di un viaggio: dati e foto. Contro un IndexedDB reale.
 *
 * Il punto delicato sono le foto: quelle nuove vanno salvate PRIMA di
 * aggiornare il viaggio, quelle tolte eliminate DOPO, e un id che il viaggio
 * non aveva non deve poter entrare da qui.
 */

function photo(byte: number): Blob {
  return new Blob([new Uint8Array([0xff, 0xd8, byte])], { type: 'image/jpeg' })
}

beforeEach(async () => {
  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
    language: 'en',
  })
  await useTravelStore.getState().hydrate()
  await useTravelStore.getState().resetData()
})

afterEach(async () => {
  await closeDatabase()
})

async function seed(photos = 0) {
  const blobs = Array.from({ length: photos }, (_, i) => photo(i))
  const visit = await useTravelStore
    .getState()
    .addVisit({ countryCode: 'JP', date: '2024-05-01', city: 'Kyoto' }, blobs.length ? blobs : undefined)
  return visit!
}

describe('updateVisit', () => {
  it('cambia i campi e li scrive su disco', async () => {
    const visit = await seed()

    const updated = await useTravelStore.getState().updateVisit(visit.id, {
      countryCode: 'jp',
      date: '2024-05-03',
      city: 'Osaka',
      note: 'Takoyaki',
    })

    expect(updated).toMatchObject({ id: visit.id, countryCode: 'JP', date: '2024-05-03', city: 'Osaka', note: 'Takoyaki' })
    expect(useTravelStore.getState().visits).toHaveLength(1)
    expect((await loadVisits())[0]).toMatchObject({ city: 'Osaka', note: 'Takoyaki' })
  })

  it('un campo tolto sparisce, non resta quello vecchio', async () => {
    const visit = await seed()
    await useTravelStore.getState().updateVisit(visit.id, { countryCode: 'JP', date: visit.date })

    expect(useTravelStore.getState().visits[0]).not.toHaveProperty('city')
    expect((await loadVisits())[0]).not.toHaveProperty('city')
  })

  it('puo spostare il viaggio su un altro Paese', async () => {
    const visit = await seed()
    await useTravelStore.getState().updateVisit(visit.id, { countryCode: 'KR', date: visit.date })

    expect(useTravelStore.getState().visits[0]?.countryCode).toBe('KR')
  })

  it('aggiunge foto a quelle che ha gia', async () => {
    const visit = await seed(1)
    const [kept] = visit.photoIds!

    const updated = await useTravelStore
      .getState()
      .updateVisit(visit.id, { countryCode: 'JP', date: visit.date, photoIds: [kept!] }, [photo(9)])

    expect(updated?.photoIds).toHaveLength(2)
    expect(updated?.photoIds?.[0]).toBe(kept)
    for (const id of updated!.photoIds!) expect(await loadPhoto(id)).toBeDefined()
  })

  it('una foto tolta viene eliminata dal disco, le altre restano', async () => {
    const visit = await seed(2)
    const [drop, keep] = visit.photoIds!

    const updated = await useTravelStore
      .getState()
      .updateVisit(visit.id, { countryCode: 'JP', date: visit.date, photoIds: [keep!] })

    expect(updated?.photoIds).toEqual([keep])
    expect(await loadPhoto(drop!)).toBeUndefined()
    expect(await loadPhoto(keep!)).toBeDefined()
  })

  it('togliere tutte le foto lascia il viaggio senza il campo', async () => {
    const visit = await seed(1)
    const updated = await useTravelStore
      .getState()
      .updateVisit(visit.id, { countryCode: 'JP', date: visit.date, photoIds: [] })

    expect(updated).not.toHaveProperty('photoIds')
    expect(await loadPhoto(visit.photoIds![0]!)).toBeUndefined()
  })

  it('un id di foto che il viaggio non aveva non entra', async () => {
    const visit = await seed(1)
    const updated = await useTravelStore
      .getState()
      .updateVisit(visit.id, { countryCode: 'JP', date: visit.date, photoIds: [...visit.photoIds!, 'estraneo'] })

    expect(updated?.photoIds).toEqual(visit.photoIds)
  })

  it('rifiuta una data non valida senza toccare niente', async () => {
    const visit = await seed()
    const result = await useTravelStore.getState().updateVisit(visit.id, { countryCode: 'JP', date: 'ieri' })

    expect(result).toBeNull()
    expect(useTravelStore.getState().visits[0]).toEqual(visit)
    expect(useTravelStore.getState().lastError?.key).toBe('storage.invalidDate')
  })

  it('rifiuta un Paese sconosciuto', async () => {
    const visit = await seed()
    expect(await useTravelStore.getState().updateVisit(visit.id, { countryCode: 'ZZ', date: visit.date })).toBeNull()
    expect(useTravelStore.getState().lastError?.key).toBe('storage.unknownCountry')
  })

  it('un id inesistente non fa niente', async () => {
    await seed()
    expect(await useTravelStore.getState().updateVisit('fantasma', { countryCode: 'JP', date: '2024-01-01' })).toBeNull()
    expect(useTravelStore.getState().visits).toHaveLength(1)
  })
})
