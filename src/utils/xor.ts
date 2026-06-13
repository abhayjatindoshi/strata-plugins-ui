export function xorEncode(text: string, key: string): string {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
  }
  return btoa(out.join(''));
}

export function xorDecode(encoded: string, key: string): string {
  const text = atob(encoded);
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
  }
  return out.join('');
}
