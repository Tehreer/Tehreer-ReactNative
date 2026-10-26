import { Select } from './ui';
import type { FontOption } from './fonts';

/** The Typeface dropdown of the screens. `disabled` while the typeface loads. */
export function FontChoice({ options, value, onChange, disabled }: { options: readonly FontOption[]; value: string; onChange: (id: string) => void; disabled?: boolean }) {
  return (
    <Select
      disabled={disabled}
      label="Typeface"
      onChange={onChange}
      options={options.map((font) => ({ value: font.id, label: font.label }))}
      testID="fontSelect"
      value={value}
    />
  );
}
