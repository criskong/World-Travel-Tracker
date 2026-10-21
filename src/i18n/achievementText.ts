import type { Achievement, AchievementDetail, AchievementId } from '../utils/achievements'
import type { Translation } from './useTranslation'
import type { TranslationKey } from './translate'

/**
 * Testi degli achievement.
 *
 * `achievements.ts` resta logica pura e senza lingua: produce un `id` e una
 * struttura `detail`. La traduzione vive qui, dove sa gia in che lingua
 * scrivere. Le chiavi si ricavano dall'id, quindi aggiungere un achievement
 * significa aggiungere le sue due chiavi al dizionario e basta — e se ci si
 * dimentica, non compila.
 */

export function achievementName(translation: Translation, id: AchievementId): string {
  return translation.t(`achievement.${id}.name` as TranslationKey)
}

export function achievementDescription(translation: Translation, id: AchievementId): string {
  return translation.t(`achievement.${id}.description` as TranslationKey)
}

export function achievementDetail(
  translation: Translation,
  detail: AchievementDetail,
): string {
  switch (detail.kind) {
    case 'countries':
      return translation.t('achievement.detail.countries#', {
        count: detail.current,
        target: detail.target,
      })
    case 'continent-progress':
      return translation.t('achievement.detail.continentProgress', {
        current: detail.current,
        total: detail.total,
        continent: translation.continent(detail.continent),
      })
    case 'continent-done':
      return translation.t('achievement.detail.continentDone', {
        continents: detail.continents.map((item) => translation.continent(item)).join(', '),
      })
    case 'none':
      return ''
  }
}

/** Nome, descrizione e dettaglio insieme: quello che serve a una card. */
export function achievementText(translation: Translation, achievement: Achievement) {
  return {
    name: achievementName(translation, achievement.id),
    description: achievementDescription(translation, achievement.id),
    detail: achievementDetail(translation, achievement.detail),
  }
}
