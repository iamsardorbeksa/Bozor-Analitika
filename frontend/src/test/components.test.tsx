import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { Money, PriceChange, QualityBadge, StatusBadge } from '@/components/market'
import { DataTable } from '@/components/ui/data-table'
import { TooltipProvider } from '@/components/ui/primitives'

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>)

describe('market components', () => {
  beforeAll(() => i18n.changeLanguage('en'))

  it('renders money with currency and unit', () => {
    const { container } = wrap(<Money value={4500} unit="kg" />)
    expect(container.textContent).toBe('4 500UZS/kg')
    expect(screen.getByText('UZS/kg')).toBeInTheDocument()
  })

  it('colours price changes for buyers (rise = bad)', () => {
    const { container } = wrap(<><PriceChange value={5} /><PriceChange value={-5} /></>)
    const spans = container.querySelectorAll('span')
    expect(spans[0].className).toContain('text-up')
    expect(spans[1].className).toContain('text-down')
  })

  it('translates badges', async () => {
    wrap(<><QualityBadge quality="first" /><StatusBadge status="countered" /></>)
    expect(screen.getByText('1st grade')).toBeInTheDocument()
    expect(screen.getByText('Countered')).toBeInTheDocument()
    await i18n.changeLanguage('ru')
    expect(await screen.findByText('1 сорт')).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})

describe('DataTable', () => {
  it('sorts by a column when the header is clicked', async () => {
    const rows = [{ id: 'a', price: 300 }, { id: 'b', price: 100 }, { id: 'c', price: 200 }]
    render(<DataTable rows={rows} rowKey={(r) => r.id} columns={[
      { key: 'id', header: 'ID', cell: (r) => r.id },
      { key: 'price', header: 'Price', cell: (r) => r.price, sortValue: (r) => r.price },
    ]} />)
    const firstCell = () => screen.getAllByRole('row')[1].querySelector('td')!.textContent
    expect(firstCell()).toBe('a')
    await userEvent.click(screen.getByRole('button', { name: /price/i }))
    expect(firstCell()).toBe('b')
    await userEvent.click(screen.getByRole('button', { name: /price/i }))
    expect(firstCell()).toBe('a')
  })
})
