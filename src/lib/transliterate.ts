export interface ScriptMap {
  vowels: Record<string, string>;
  cons: Record<string, string>;
  matra: Record<string, string>;
  halant: string;
}

export const DEV: ScriptMap = {
  vowels: {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  },
  cons: {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng', 'च': 'ch', 'छ': 'chh',
    'ज': 'j', 'झ': 'jh', 'ञ': 'ny', 'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh',
    'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n', 'प': 'p',
    'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l',
    'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  },
  matra: {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'े': 'e', 'ै': 'ai',
    'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h',
  },
  halant: '्',
};

export const TAM: ScriptMap = {
  vowels: {
    'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
    'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
  },
  cons: {
    'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'nj', 'ட': 't', 'ண': 'n', 'த': 'th',
    'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v',
    'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n', 'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
  },
  matra: {
    'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'ae',
    'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au',
  },
  halant: '்',
};

export function transliterate(text: string, map: ScriptMap): string {
  let out = '';
  const c = [...text];
  for (let i = 0; i < c.length; i++) {
    const ch = c[i];
    const nx = c[i + 1];
    if (map.vowels[ch]) {
      out += map.vowels[ch];
      continue;
    }
    if (map.cons[ch]) {
      if (nx === map.halant) {
        out += map.cons[ch];
        i++;
        continue;
      }
      if (nx && map.matra[nx]) {
        out += map.cons[ch] + map.matra[nx];
        i++;
        continue;
      }
      out += map.cons[ch] + 'a';
      continue;
    }
    out += ch;
  }
  return out;
}

export function scriptOf(text: string): 'devanagari' | 'tamil' | 'latin' {
  if (/[\u0900-\u097F]/.test(text)) return 'devanagari';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  return 'latin';
}
