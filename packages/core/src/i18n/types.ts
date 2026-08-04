import type { nl } from './nl';

/** Every copy key in the product. Derived from the Dutch dictionary so a key
 *  cannot exist in one language only. */
export type CopyKey = keyof typeof nl;

export type Dictionary = Record<CopyKey, string>;
