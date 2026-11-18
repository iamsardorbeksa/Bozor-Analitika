import i18n from '@/i18n'
import { humanizeAnswer, methodLabel, toolLabel } from '@/lib/humanize'

describe('humanizeAnswer', () => {
  it('replaces internal identifiers with plain translated text', async () => {
    await i18n.changeLanguage('uz')
    const t = i18n.t.bind(i18n)
    const raw = [
      '**Kartoshka** uchun 7 kunlik statistik prognoz: 5 000 atrofida, ishonchlilik: **low**. Usul: holt_damped+linear_regression.',
      'Men `compare_offers` va search_products() vositalaridan foydalandim. Signal: demand_gap.',
      "_Eslatma: ko'rsatkichlar demo ma'lumotlarga asoslangan, real bozor narxi emas._",
    ].join('\n\n')
    const out = humanizeAnswer(raw, t)
    expect(out).not.toMatch(/compare_offers|search_products|holt_damped|demand_gap|\blow\b|demo/)
    expect(out).toContain(toolLabel(t, 'compare_offers'))
    expect(out).toContain(methodLabel(t, 'holt_damped+linear_regression'))
    expect(toolLabel(t, 'something_new')).toBe(t('ai:tools.other'))
  })
})
