export function normalizeApiUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { throw new Error('Podaj poprawny adres serwera HTTP lub HTTPS.'); }
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Adres serwera musi używać HTTP lub HTTPS i nie może zawierać hasła, parametrów ani fragmentu.');
  }
  const host = parsed.hostname;
  const octets = /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host.split('.').map(Number) : [];
  const ipv4 = octets.length === 4 && octets.every(value => value >= 0 && value <= 255);
  const local = host === 'localhost' || host === '[::1]' || host === '::1' || (ipv4 && (
    octets[0] === 127 || octets[0] === 10 ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  ));
  if (parsed.protocol === 'http:' && !local) throw new Error('Publiczny serwer wymaga HTTPS. HTTP jest dostępne dla sieci lokalnej.');
  return parsed.toString().replace(/\/+$/, '');
}

