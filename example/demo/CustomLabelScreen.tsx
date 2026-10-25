import { Linking, StyleSheet, Text } from 'react-native';
import { Color, DrawStyle, TLabel, TMutableText, TextAlignment, initialize } from 'tehreer-react-native';
import { useTypeface } from './fonts';
import { ARTICLE_REFERENCE, ARTICLE_SEGMENTS, ARTICLE_TITLE } from './data/article';
import { Card, Message, Page, colors } from './ui';
import { useOwned } from './useOwned';

/** The links of the article with the code units they cover. */
const LINKS = (() => {
  const links: { fromIndex: number; toIndex: number; href: string }[] = [];
  let index = 0;
  for (const segment of ARTICLE_SEGMENTS) {
    if (segment.href !== undefined) {
      links.push({ fromIndex: index, toIndex: index + segment.text.length, href: segment.href });
    }
    index += segment.text.length;
  }
  return links;
})();

function makeArticle(): TMutableText {
  initialize();
  const text = new TMutableText(ARTICLE_SEGMENTS.map((segment) => segment.text).join(''));
  let index = 0;
  for (const segment of ARTICLE_SEGMENTS) {
    const end = index + segment.text.length;
    if (segment.color !== undefined && end > index) {
      text.setAttributes(index, end, { foregroundColor: Color.parse(segment.color) });
    }
    index = end;
  }
  return text;
}

export function CustomLabelScreen({ onBack }: { onBack: () => void }) {
  const { typeface, error } = useTypeface('mehr');
  const article = useOwned(makeArticle, []);
  // The label reads the text when it changes identity, so it gets a copy that nobody edits.
  const shown = useOwned(() => article?.copy(), [article]);

  return (
    <Page title="Custom Label" summary="A label that lays out styled, mixed-script text. Tap a blue link to open it." onBack={onBack}>
      <Card>
        <Text style={styles.title}>{ARTICLE_TITLE}</Text>
        {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
        {typeface !== undefined && shown !== undefined && (
          <TLabel
            attributedText={shown}
            drawStyle={DrawStyle.FillStroke}
            lineHeightMultiplier={1.15}
            onTap={(index) => {
              const link = index === undefined ? undefined : LINKS.find((candidate) => index >= candidate.fromIndex && index < candidate.toIndex);
              if (link !== undefined) {
                void Linking.openURL(link.href);
              }
            }}
            strokeColor="#FF7F00"
            strokeRadius={0.25}
            style={{ alignSelf: 'stretch' }}
            testID="articleLabel"
            textAlignment={TextAlignment.Right}
            textColor="#1E5A3C"
            textSize={24}
            typeface={typeface}
          />
        )}
        <Text onPress={() => void Linking.openURL(ARTICLE_REFERENCE)} style={styles.source}>{ARTICLE_REFERENCE}</Text>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '600', color: colors.text },
  source: { fontSize: 13, color: colors.ltr, textDecorationLine: 'underline' },
});
