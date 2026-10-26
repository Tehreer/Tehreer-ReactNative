import { useState } from 'react';
import { TLabel, TextAlignment } from 'tehreer-react-native';
import { FontChoice } from './FontChoice';
import { DEFAULT_TEXT_FONT, TEXT_FONTS, useTypeface } from './fonts';
import { Card, Definition, Message, Page, Rows, Section } from './ui';

const SPECIMEN = 'زبان کو مختلف علامتوں اور رموز کے ذریعے لکھنے کو تحریر کہتے ہیں۔';

export function TypefaceInfoScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState(DEFAULT_TEXT_FONT);
  const { typeface, error } = useTypeface(fontId);

  return (
    <Page title="Typeface Information" onBack={onBack}>
      <Card>
        <FontChoice disabled={typeface === undefined} onChange={setFontId} options={TEXT_FONTS} value={fontId} />
      </Card>
      {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
      {typeface === undefined && error === undefined && <Message>Loading the typeface…</Message>}
      {typeface !== undefined && (
        <>
          <Section title="Specimen">
            <TLabel
              lineHeightMultiplier={1.1}
              style={{ alignSelf: 'stretch', marginTop: -6 }}
              text={SPECIMEN}
              textAlignment={TextAlignment.Right}
              textColor="#111A14"
              textSize={23}
              typeface={typeface}
            />
          </Section>
          <Section title="Names">
            <Rows>
              <Definition term="Family" value={typeface.familyName} />
              <Definition term="Style" value={typeface.styleName} />
              <Definition isLast term="Full name" value={typeface.fullName} />
            </Rows>
          </Section>
          <Section title="Metrics">
            <Rows>
              <Definition isMono term="Units per em" value={typeface.unitsPerEm} />
              <Definition isMono term="Ascent" value={typeface.ascent} />
              <Definition isMono term="Descent" value={typeface.descent} />
              <Definition isMono term="Leading" value={typeface.leading} />
              <Definition isLast isMono term="Glyph count" value={typeface.glyphCount} />
            </Rows>
          </Section>
        </>
      )}
    </Page>
  );
}
