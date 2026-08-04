import { LOCALES, type Locale } from '@luwte/core';
import {
  Button,
  Card,
  Hairline,
  HumanText,
  ScaleInput,
  Screen,
  type ScaleValue,
} from '@luwte/ui';
import { useState } from 'react';
import { useLocale } from '../providers/LocaleProvider';
import { useTheme } from '../providers/ThemeProvider';
import styles from './Styleguide.module.css';

const SEMANTIC_TOKENS = [
  ['--bg', 'achtergrond'],
  ['--surface', 'kaart'],
  ['--line', 'haarlijn'],
  ['--text', 'tekst'],
  ['--text-quiet', 'secundair'],
  ['--self', 'eigen data'],
  ['--human', 'iemand anders'],
] as const;

const TYPE_SCALE = [
  ['--text-2xl', 'De vraag, alleen op het scherm'],
  ['--text-xl', 'Schermtitel'],
  ['--text-lg', 'Sectiekop'],
  ['--text-base', 'Broodtekst'],
  ['--text-sm', 'Secundair'],
  ['--text-xs', 'Label'],
] as const;

/**
 * Not linked from product navigation. It exists so a brand rule can be
 * checked in ten seconds rather than argued about.
 */
export function Styleguide() {
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const [scale, setScale] = useState<ScaleValue | null>(null);

  return (
    <Screen title={t('styleguideTitle')}>
      <section className={styles.section}>
        <div className={styles.row}>
          <Button variant="quiet" onClick={toggleTheme}>
            {theme === 'dark' ? t('themeLight') : t('themeDark')}
          </Button>
          {LOCALES.map((l: Locale) => (
            <Button
              key={l}
              variant="quiet"
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
            >
              {l}
            </Button>
          ))}
        </div>
      </section>

      <Hairline />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Kleur</h2>
        <p className={styles.note}>
          Zeeglas is wat de persoon zelf invulde. Amber is waar iemand anders is geweest. Nooit
          door elkaar.
        </p>
        <ul className={styles.swatches}>
          {SEMANTIC_TOKENS.map(([token, label]) => (
            <li key={token} className={styles.swatch}>
              <span className={styles.chip} style={{ background: `var(${token})` }} />
              <span>{token}</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <Hairline />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Typografie</h2>
        <p className={styles.note}>
          Alles wat de app zegt staat in de schreefloze. Alles wat een mens schreef staat in de
          schreef.
        </p>
        {TYPE_SCALE.map(([token, sample]) => (
          <p key={token} style={{ fontSize: `var(${token})`, margin: 0, lineHeight: 1.2 }}>
            {sample}
          </p>
        ))}
        <HumanText>vandaag met mama gewandeld tot aan de brug</HumanText>
      </section>

      <Hairline />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Componenten</h2>
        <Card>
          <p className={styles.note}>Card op --surface, radius 12.</p>
        </Card>
        <div className={styles.row}>
          <Button>Bewaren</Button>
          <Button variant="quiet">{t('navBack')}</Button>
          <Button disabled>Bewaren</Button>
        </div>
      </section>

      <Hairline />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('checkinMood')}</h2>
        <ScaleInput
          name="styleguide-mood"
          legend={t('checkinMood')}
          value={scale}
          onChange={setScale}
          lowLabel={t('scaleLow')}
          highLabel={t('scaleHigh')}
          stepLabels={[
            t('scaleStep1'),
            t('scaleStep2'),
            t('scaleStep3'),
            t('scaleStep4'),
            t('scaleStep5'),
            t('scaleStep6'),
            t('scaleStep7'),
          ]}
        />
        <p className={styles.scaleSample}>
          {scale === null ? t('optionalPractice') : t('checkinDone')}
        </p>
      </section>
    </Screen>
  );
}
