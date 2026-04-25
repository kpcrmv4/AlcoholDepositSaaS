'use client';

/**
 * Theme registry — selects the right per-store renderer based on
 * `props.themeKey` and supplies the bottle list as the chrome's children.
 *
 * Each theme is implemented as two files:
 *   - chrome.tsx — header / hero / stats / search / filter / fab / styles
 *   - cards.tsx  — bottle list + cards (rendered inside chrome's children)
 *
 * Adding a new theme:
 *   1. Add the key to CustomerThemeKey in src/lib/customer-themes.ts
 *   2. Create _themes/<key>/{chrome,cards}.tsx (mirror amber's shape)
 *   3. Add a case to the switch below
 */

import { AmberView } from './amber/chrome';
import { AmberBottleList } from './amber/cards';
import { NeonView } from './neon/chrome';
import { NeonBottleList } from './neon/cards';
import { SumiView } from './sumi/chrome';
import { SumiBottleList } from './sumi/cards';
import { SunsetView } from './sunset/chrome';
import { SunsetBottleList } from './sunset/cards';
import { CrimsonView } from './crimson/chrome';
import { CrimsonBottleList } from './crimson/cards';
import type { ThemeViewProps } from './types';

export function ThemedCustomerView(props: ThemeViewProps) {
  switch (props.themeKey) {
    case 'neon':
      return (
        <NeonView props={props}>
          <NeonBottleList props={props} />
        </NeonView>
      );
    case 'sumi':
      return (
        <SumiView props={props}>
          <SumiBottleList props={props} />
        </SumiView>
      );
    case 'sunset':
      return (
        <SunsetView props={props}>
          <SunsetBottleList props={props} />
        </SunsetView>
      );
    case 'crimson':
      return (
        <CrimsonView props={props}>
          <CrimsonBottleList props={props} />
        </CrimsonView>
      );
    case 'amber':
    default:
      return (
        <AmberView props={props}>
          <AmberBottleList props={props} />
        </AmberView>
      );
  }
}
