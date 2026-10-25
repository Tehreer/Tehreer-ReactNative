import { useState } from 'react';
import { TLabel, TextAlignment } from 'tehreer-react-native';
import { FontChoice } from './FontChoice';
import { TEXT_FONTS, useTypeface } from './fonts';
import { Card, Definition, Message, Page } from './ui';

const SPECIMEN = 'زبان کو مختلف علامتوں اور رموز کے ذریعے لکھنے کو تحریر کہتے ہیں۔';

export function TypefaceInfoScreen({ onBack }: { onBack: () => void }) {
  const [fontId, setFontId] = useState('mehr');
  const { typeface, error } = useTypeface(fontId);

  return (
    <Page title="Typeface Information" summary="Read the names and metrics of a loaded typeface." onBack={onBack}>
      <Card>
        <FontChoice onChange={setFontId} options={TEXT_FONTS} value={fontId} />
      </Card>
      {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
      {typeface === undefined && error === undefined && <Message>Loading the typeface...</Message>}
      {typeface !== undefined && (
        <>
          <Card title="Specimen">
            <TLabel
              style={{ alignSelf: 'stretch' }}
              lineHeightMultiplier={1.4}
              text={SPECIMEN}
              textAlignment={TextAlignment.Right}
              textColor="#111A14"
              textSize={30}
              typeface={typeface}
            />
          </Card>
          <Card title="Names">
            <Definition term="Family name" value={typeface.familyName} />
            <Definition term="Style name" value={typeface.styleName} />
            <Definition term="Full name" value={typeface.fullName} />
          </Card>
          <Card title="Metrics">
            <Definition term="Units per em" value={typeface.unitsPerEm} />
            <Definition term="Ascent" value={typeface.ascent} />
            <Definition term="Descent" value={typeface.descent} />
            <Definition term="Leading" value={typeface.leading} />
            <Definition term="Glyph count" value={typeface.glyphCount} />
          </Card>
        </>
      )}
    </Page>
  );
}
