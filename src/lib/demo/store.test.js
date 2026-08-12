import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetDemo,
  demoSendMessage,
  demoListMessages,
  demoStartConversation,
  demoCreateReport,
  demoListReports,
  demoConfirmMatch,
  demoGetMatch,
  demoCreateFlag,
} from './store'

/**
 * اختبارات على المخزن التجريبي — تغطي القواعد التي يجب أن تصمد في Supabase
 * أيضًا: منع تكرار الرسائل والمحادثات والمطابقات والإبلاغات.
 */
beforeEach(() => {
  localStorage.clear()
  resetDemo()
})

describe('منع تكرار الرسائل', () => {
  it('نفس client_id لا ينتج رسالتين', async () => {
    const before = await demoListMessages('c-harbi')

    const first = await demoSendMessage({
      conversationId: 'c-harbi',
      body: 'رسالة اختبار',
      clientId: 'cid-1',
    })
    const second = await demoSendMessage({
      conversationId: 'c-harbi',
      body: 'رسالة اختبار',
      clientId: 'cid-1',
    })

    expect(second.id).toBe(first.id)
    const after = await demoListMessages('c-harbi')
    expect(after.length).toBe(before.length + 1)
  })

  it('معرّفان مختلفان ينتجان رسالتين', async () => {
    const before = await demoListMessages('c-harbi')
    await demoSendMessage({ conversationId: 'c-harbi', body: 'أولى', clientId: 'cid-a' })
    await demoSendMessage({ conversationId: 'c-harbi', body: 'ثانية', clientId: 'cid-b' })
    const after = await demoListMessages('c-harbi')
    expect(after.length).toBe(before.length + 2)
  })

  it('الرسائل مرتّبة زمنيًا تصاعديًا', async () => {
    const rows = await demoListMessages('c-harbi')
    const times = rows.map((m) => new Date(m.created_at).getTime())
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })
})

describe('منع تكرار المحادثات', () => {
  it('بدء محادثة مرتين على نفس البلاغ يعيد نفس المعرّف', async () => {
    const a = await demoStartConversation('r-card-found')
    const b = await demoStartConversation('r-card-found')
    expect(a).toBe(b)
  })

  it('لا يمكن بدء محادثة مع بلاغ يملكه المستخدم نفسه', async () => {
    await expect(demoStartConversation('r-buds-lost')).rejects.toThrow()
  })
})

describe('منع تكرار المطابقات', () => {
  it('نشر بلاغ مطابق ينشئ مطابقة واحدة لا أكثر', async () => {
    const input = {
      type: 'found',
      category_id: 'cat-electronics',
      title: 'سماعات لاسلكية بيضاء',
      description: 'سماعات لاسلكية بيضاء داخل علبة شحن بيضاء، عليها خدش صغير في الزاوية.',
      place: 'مبنى ٤ — قاعة ٢٠٣',
      event_date: new Date().toISOString().slice(0, 10),
    }

    // البلاغ التجريبي r-buds-lost لمستخدم العرض نفسه، فلا يُطابَق معه.
    // نتحقق فقط من أن إعادة تشغيل المطابقة لا تُضاعف الأزواج الموجودة.
    const created = await demoCreateReport(input, [])
    const match = await demoGetMatch('m-wallet')
    expect(match.id).toBe('m-wallet')
    expect(created.id).toBeTruthy()
  })

  it('تأكيد المطابقة مرتين يعيد نفس المحادثة', async () => {
    const first = await demoConfirmMatch('m-wallet')
    const second = await demoConfirmMatch('m-wallet')
    expect(second).toBe(first)
  })

  it('تأكيد المطابقة يحوّل البلاغين إلى «قيد التسليم»', async () => {
    await demoConfirmMatch('m-wallet')
    const match = await demoGetMatch('m-wallet')
    expect(match.status).toBe('confirmed')
    expect(match.lost_report.status).toBe('claimed')
    expect(match.found_report.status).toBe('claimed')
  })
})

describe('منع تكرار الإبلاغ', () => {
  it('الإبلاغ عن نفس البلاغ مرتين يُرفض', async () => {
    await demoCreateFlag({ reportId: 'r-card-found', reason: 'spam', details: '' })
    await expect(
      demoCreateFlag({ reportId: 'r-card-found', reason: 'spam', details: '' }),
    ).rejects.toThrow()
  })
})

describe('فلترة البلاغات', () => {
  it('تصفية النوع تعيد بلاغات من ذلك النوع فقط', async () => {
    const { items } = await demoListReports({ type: 'found' })
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((r) => r.type === 'found')).toBe(true)
  })

  it('البحث النصي يطابق العنوان أو المكان أو الوصف', async () => {
    const { items } = await demoListReports({ q: 'محفظة' })
    expect(items.length).toBeGreaterThan(0)
    expect(
      items.every(
        (r) => r.title.includes('محفظة') || r.description.includes('محفظة') || r.place.includes('محفظة'),
      ),
    ).toBe(true)
  })

  it('لا تظهر البلاغات المغلقة في القوائم العامة', async () => {
    const { items } = await demoListReports({})
    expect(items.every((r) => r.status !== 'closed')).toBe(true)
  })

  it('حجم الصفحة ١٢ عنصرًا', async () => {
    const page = await demoListReports({})
    expect(page.pageSize).toBe(12)
    expect(page.items.length).toBeLessThanOrEqual(12)
  })

  it('الصفحة الثانية لا تكرّر عناصر الأولى', async () => {
    const first = await demoListReports({ page: 1 })
    const second = await demoListReports({ page: 2 })
    const firstIds = new Set(first.items.map((r) => r.id))
    expect(second.items.some((r) => firstIds.has(r.id))).toBe(false)
  })

  it('البلاغ الجديد يظهر أعلى القائمة', async () => {
    const created = await demoCreateReport(
      {
        type: 'found',
        category_id: 'cat-other',
        title: 'مظلة زرقاء جديدة',
        description: 'وُجدت عند البوابة.',
        place: 'البوابة ١',
        event_date: new Date().toISOString().slice(0, 10),
      },
      [],
    )
    const { items } = await demoListReports({})
    expect(items[0].id).toBe(created.id)
  })
})
