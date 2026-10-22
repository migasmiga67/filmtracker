import * as SelectPrimitive from '@radix-ui/react-select'

const EMPTY = '__klaps_empty__'
const Chevron = ({ up = false }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
  </svg>
)

export default function Select({ label, value, onChange, options }) {
  return (
    <SelectPrimitive.Root value={value || EMPTY} onValueChange={(next) => onChange(next === EMPTY ? '' : next)}>
      <SelectPrimitive.Trigger className="select-trigger" aria-label={label}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="select-chevron"><Chevron /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="select-menu" position="popper" sideOffset={6} collisionPadding={12}>
          <SelectPrimitive.ScrollUpButton className="select-scroll"><Chevron up /></SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item className="select-option" key={option.value} value={option.value || EMPTY}>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="select-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll"><Chevron /></SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
