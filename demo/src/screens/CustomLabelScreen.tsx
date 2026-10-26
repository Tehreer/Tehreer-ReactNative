import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { Color, TLabel, TMutableText, TextAlignment, initialize } from 'tehreer-react-native';
import type { Rect, TLabelHandle } from 'tehreer-react-native';
import { DEFAULT_TEXT_FONT } from '../fonts/fonts';
import { useTypeface } from '../hooks/useTypeface';
import { ARTICLE_REFERENCE, ARTICLE_SEGMENTS, ARTICLE_TITLE } from '../data/article';
import { Card } from '../components/Card';
import { Message } from '../components/Message';
import { Page } from '../components/Page';
import { colors } from '../theme/colors';
import { useOwned } from '../hooks/useOwned';

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
  const { typeface, error } = useTypeface(DEFAULT_TEXT_FONT);
  const article = useOwned(makeArticle, []);
  // The label reads the text when it changes identity, so it gets a copy that nobody edits.
  const shown = useOwned(() => article?.copy(), [article]);
  const label = useRef<TLabelHandle>(null);
  // The rectangles of the link that is under the finger; the label has no highlights, so they are
  // views behind it. The touch events bubble up from the label, which keeps its own tap.
  const [pressed, setPressed] = useState<readonly Rect[]>([]);
  const [isSourcePressed, setSourcePressed] = useState(false);

  const linkAt = (index: number | undefined) =>
    index === undefined ? undefined : LINKS.find((candidate) => index >= candidate.fromIndex && index < candidate.toIndex);
  const press = (event: GestureResponderEvent) => {
    const link = linkAt(label.current?.indexOfCodeUnit(event.nativeEvent.locationX, event.nativeEvent.locationY));
    setPressed(link === undefined ? [] : label.current?.getSelectionRects(link.fromIndex, link.toIndex) ?? []);
  };
  const release = () => setPressed([]);

  return (
    <Page title="Custom Label" onBack={onBack}>
      <Card style={styles.article}>
        <Text style={styles.title}>{ARTICLE_TITLE}</Text>
        {error !== undefined && <Message tone="error">{`Could not load the typeface: ${error.message}`}</Message>}
        {typeface === undefined && error === undefined && <Message>Loading the typeface…</Message>}
        {typeface !== undefined && shown !== undefined && (
          <View onTouchCancel={release} onTouchEnd={release} onTouchStart={press}>
            {pressed.map((rect, index) => (
              <View key={index} pointerEvents="none" style={[styles.pressed, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]} />
            ))}
            <TLabel
              attributedText={shown}
              lineHeightMultiplier={1.3}
              onTap={(index) => {
                const link = linkAt(index);
                if (link !== undefined) {
                  void Linking.openURL(link.href);
                }
              }}
              ref={label}
              style={{ alignSelf: 'stretch' }}
              testID="articleLabel"
              textAlignment={TextAlignment.Right}
              textColor="#1E5A3C"
              textSize={26}
              typeface={typeface}
            />
          </View>
        )}
        <Text
          onPress={() => void Linking.openURL(ARTICLE_REFERENCE)}
          onPressIn={() => setSourcePressed(true)}
          onPressOut={() => setSourcePressed(false)}
          style={[styles.source, isSourcePressed && styles.sourcePressed]}
        >{ARTICLE_REFERENCE}</Text>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  article: { gap: 6, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 28, lineHeight: 34, fontStyle: 'italic', fontWeight: '500', color: colors.link },
  pressed: { position: 'absolute', borderRadius: 3, backgroundColor: 'rgba(26,86,196,0.22)' },
  sourcePressed: { backgroundColor: 'rgba(26,86,196,0.22)' },
  source: { alignSelf: 'flex-start', paddingVertical: 14, fontSize: 14, fontStyle: 'italic', fontWeight: '500', color: colors.link },
});
