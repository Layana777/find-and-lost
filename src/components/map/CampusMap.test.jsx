import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampusMap } from './CampusMap'

const LOST = { place: 'أمام المكتبة المركزية — البوابة ٢', tone: 'lost', label: 'فُقد هنا' }
const FOUND = { place: 'الكافتيريا — الدور الأول', tone: 'found', label: 'وُجد هنا' }

describe('CampusMap', () => {
  it('يضع دبّوسًا باسم الموقع المستنتج', () => {
    render(<CampusMap points={[LOST]} />)
    expect(screen.getByText('فُقد هنا')).toBeInTheDocument()
    // اسم الموقع يظهر على اللافتة، لا نصّ البلاغ الخام
    expect(screen.getAllByText('المكتبة المركزية').length).toBeGreaterThan(0)
  })

  it('يذكر ما تعذّر تحديده تحت المخطّط بدل وضعه في غير محلّه', () => {
    const { container } = render(
      <CampusMap points={[{ place: 'مكان مجهول تمامًا', tone: 'lost', label: 'فُقد هنا' }]} />,
    )
    expect(container.querySelectorAll('.map-pin')).toHaveLength(0)
    expect(screen.getByText(/خارج المواقع/)).toBeInTheDocument()
  })

  it('يرسم المسار بين موقعين مختلفين حين يُطلب الربط', () => {
    const { container } = render(<CampusMap points={[LOST, FOUND]} connect />)
    expect(container.querySelectorAll('.map-pin')).toHaveLength(2)
    expect(container.querySelector('.map-connector')).toBeTruthy()
  })

  it('لا يرسم مسارًا حين يقع البلاغان في الموقع نفسه', () => {
    const samePlace = { ...FOUND, place: 'المكتبة — الدور الثاني' }
    const { container } = render(<CampusMap points={[LOST, samePlace]} connect />)
    expect(container.querySelector('.map-connector')).toBeNull()
    // ومع ذلك يبقى الدبّوسان ظاهرين، مُزاحًا أحدهما عن الآخر
    const pins = container.querySelectorAll('.map-pin')
    expect(pins).toHaveLength(2)
    expect(pins[0].style.left).not.toBe(pins[1].style.left)
  })

  it('لا يرسم مسارًا دون طلب الربط', () => {
    const { container } = render(<CampusMap points={[LOST, FOUND]} />)
    expect(container.querySelector('.map-connector')).toBeNull()
  })

  it('يعرض الختم حين يُمرَّر', () => {
    render(<CampusMap points={[LOST]} stamp="تم الاسترجاع" />)
    expect(screen.getByText('تم الاسترجاع')).toBeInTheDocument()
  })

  it('يتجاهل النقاط بلا مكان', () => {
    const { container } = render(
      <CampusMap points={[{ place: '', tone: 'lost', label: 'فُقد هنا' }, null]} />,
    )
    expect(container.querySelectorAll('.map-pin')).toHaveLength(0)
    expect(screen.queryByText(/خارج المواقع/)).toBeNull()
  })

  it('المخطّط نفسه مخفيّ عن قارئ الشاشة — النصّ في اللافتات والتعليق', () => {
    const { container } = render(<CampusMap points={[LOST]} caption="تعليق" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('تعليق')).toBeInTheDocument()
  })
})
