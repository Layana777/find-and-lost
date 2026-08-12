import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { TYPE_OPTIONS } from '../../lib/constants'

/**
 * لوحة الفلاتر الجانبية في شاشة البحث. لا تحتفظ بحالة داخلية: كل تغيير يذهب
 * مباشرة إلى الـ URL عبر `onChange`، فيبقى الرابط هو مصدر الحقيقة الوحيد.
 */
export function ReportFilters({ filters, categories = [], onChange, onToggleCategory, onReset }) {
  return (
    <aside className="stack stack-6" aria-label="فلاتر البحث">
      <fieldset className="filter-group">
        <legend className="section-label">النوع</legend>
        <div className="stack stack-2">
          {TYPE_OPTIONS.map((option) => (
            <label className="radio" key={option.value}>
              <input
                type="radio"
                name="filter-type"
                value={option.value}
                checked={filters.type === option.value}
                onChange={() => onChange({ type: option.value })}
              />
              <span className="dot" />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend className="section-label">الفئة</legend>
        <div className="stack stack-2">
          {categories.map((category) => (
            <label className="radio" key={category.id}>
              <input
                type="checkbox"
                checked={filters.categoryIds.includes(category.id)}
                onChange={() => onToggleCategory(category.id)}
              />
              <span className="box" />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <Input
        label="المكان"
        placeholder="مبنى، قاعة، بوابة"
        value={filters.place}
        onChange={(event) => onChange({ place: event.target.value })}
      />
      <Input
        label="من تاريخ"
        type="date"
        value={filters.from}
        max={filters.to || undefined}
        onChange={(event) => onChange({ from: event.target.value })}
      />
      <Input
        label="إلى تاريخ"
        type="date"
        value={filters.to}
        min={filters.from || undefined}
        onChange={(event) => onChange({ to: event.target.value })}
      />

      <Button block onClick={onReset}>
        إعادة ضبط الفلاتر
      </Button>
    </aside>
  )
}
