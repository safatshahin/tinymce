import { Type } from '@ephox/katamari';

import { CharacterMap } from './StringMapper';
import { characterIndices as ci } from './UnicodeData';

const isWordBoundary = (map: CharacterMap, index: number): boolean => {
  const type = map[index];
  const nextType = map[index + 1];

  if (index < 0 || (index > map.length - 1 && index !== 0)) {
    return false;
  }

  // Break on or before punctuation or whitespace
  if (type === ci.PUNCTUATION || nextType === ci.PUNCTUATION || type === ci.WHITESPACE || nextType === ci.WHITESPACE) {
    return true;
  }

  // Break when word ends
  if (Type.isUndefined(nextType)) {
    return true;
  }

  // WB5. Don't break between most letters.
  if (type === ci.ALETTER && nextType === ci.ALETTER) {
    return false;
  }

  const nextNextType = map[index + 2];

  // WB6. Don't break letters across certain punctuation.
  if (type === ci.ALETTER &&
    (nextType === ci.MIDLETTER || nextType === ci.MIDNUMLET || nextType === ci.AT) &&
    nextNextType === ci.ALETTER) {
    return false;
  }

  const prevType = map[index - 1];

  // WB7. Don't break letters across certain punctuation.
  if ((type === ci.MIDLETTER || type === ci.MIDNUMLET || nextType === ci.AT) &&
    nextType === ci.ALETTER &&
    prevType === ci.ALETTER) {
    return false;
  }

  // WB8/WB9/WB10. Don't break inside sequences of digits or digits
  // adjacent to letters.
  if ((type === ci.NUMERIC || type === ci.ALETTER) &&
    (nextType === ci.NUMERIC || nextType === ci.ALETTER)) {
    return false;
  }

  // WB11. Don't break inside numeric sequences like "3.2" or
  // "3,456.789".
  if ((type === ci.MIDNUM || type === ci.MIDNUMLET) &&
    nextType === ci.NUMERIC &&
    prevType === ci.NUMERIC) {
    return false;
  }

  // WB12. Don't break inside numeric sequences like "3.2" or
  // "3,456.789".
  if (type === ci.NUMERIC &&
    (nextType === ci.MIDNUM || nextType === ci.MIDNUMLET) &&
    nextNextType === ci.NUMERIC) {
    return false;
  }

  // WB4. Ignore format and extend characters.
  if (type === ci.EXTEND || type === ci.FORMAT ||
    prevType === ci.EXTEND || prevType === ci.FORMAT ||
    nextType === ci.EXTEND || nextType === ci.FORMAT) {
    return false;
  }

  // WB3. Don't break inside CRLF.
  if (type === ci.CR && nextType === ci.LF) {
    return false;
  }

  // WB3a. Break before newlines (including CR and LF).
  if (type === ci.NEWLINE || type === ci.CR || type === ci.LF) {
    return true;
  }

  // WB3b. Break after newlines (including CR and LF).
  if (nextType === ci.NEWLINE || nextType === ci.CR || nextType === ci.LF) {
    return true;
  }

  // WB13. Don't break between Katakana characters.
  if (type === ci.KATAKANA && nextType === ci.KATAKANA) {
    return false;
  }

  // WB13a. Don't break from extenders.
  if (nextType === ci.EXTENDNUMLET &&
    (type === ci.ALETTER || type === ci.NUMERIC || type === ci.KATAKANA ||
      type === ci.EXTENDNUMLET)) {
    return false;
  }

  // WB13b. Don't break from extenders.
  if (type === ci.EXTENDNUMLET &&
    (nextType === ci.ALETTER || nextType === ci.NUMERIC ||
      nextType === ci.KATAKANA)) {
    return false;
  }

  if (type === ci.AT) {
    return false;
  }

  // Don't break after any character not covered by the rules above.
  return false;
};

export {
  isWordBoundary
};
