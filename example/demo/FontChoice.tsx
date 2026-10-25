import { Choice, Label } from './ui';
import type { FontOption } from './fonts';

export function FontChoice({ options, value, onChange }: { options: readonly FontOption[]; value: string; onChange: (id: string) => void }) {
  return (
    <>
      <Label>Typeface</Label>
      <Choice onChange={onChange} options={options.map((font) => ({ value: font.id, label: font.label }))} value={value} />
    </>
  );
}
