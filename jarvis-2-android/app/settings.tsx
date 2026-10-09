import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api, getApiUrl, hasApiToken, normalizeApiUrl, setApiToken, setApiUrl } from '../lib/api';

export default function Settings() {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [storedToken, setStoredToken] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    Promise.all([getApiUrl(), hasApiToken()]).then(([base, exists]) => {
      setUrl(base); setStoredToken(exists); setLoaded(true);
    }).catch(error => setStatus(error instanceof Error ? error.message : 'Nie udało się odczytać ustawień.'));
  }, []);

  async function save() {
    if (busy || !loaded) return;
    setBusy(true); setStatus('');
    try {
      const base = normalizeApiUrl(url);
      const oldBase = await getApiUrl();
      if (storedToken && base !== oldBase && !token.trim()) throw new Error('Dla zmienionego adresu serwera wpisz jego token lub usuń zapisany token.');
      await setApiUrl(base);
      if (token.trim()) { await setApiToken(token); setStoredToken(true); setToken(''); }
      setStatus('Ustawienia zapisane. Sprawdzanie połączenia…');
      const health = await api.health();
      setStatus('Połączenie działa. AI: ' + (health.ai === 'configured' ? 'skonfigurowane' : 'wymaga konfiguracji na serwerze'));
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Nie udało się zapisać ustawień.'); }
    finally { setBusy(false); }
  }

  function forgetToken() {
    Alert.alert('Usuń token', 'Usunąć zapisany token z tego urządzenia?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => {
        setBusy(true);
        setApiToken('').then(() => { setStoredToken(false); setToken(''); setStatus('Token usunięty.'); })
          .catch(error => setStatus(String(error))).finally(() => setBusy(false));
      } }
    ]);
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Text style={styles.kicker}>JARVIS / KONFIGURACJA</Text><Text style={styles.title}>Połączenie</Text>
    <Text style={styles.label}>ADRES BACKENDU</Text>
    <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} style={styles.input} keyboardType="url" placeholder="Adres HTTPS serwera" placeholderTextColor="#697584" />
    <Text style={styles.help}>Na telefonie użyj adresu dostępnego z telefonu. 10.0.2.2 działa wyłącznie w emulatorze. Dla publicznego serwera wymagane jest HTTPS.</Text>
    <Text style={styles.label}>TOKEN API</Text>
    <TextInput value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} secureTextEntry style={styles.input} placeholder={storedToken ? 'Zapisany token; puste pole zachowuje token' : 'Wpisz token serwera'} placeholderTextColor="#697584" />
    {storedToken && <Pressable disabled={busy} onPress={forgetToken}><Text style={styles.help}>Usuń zapisany token</Text></Pressable>}
    {status ? <Text accessibilityLiveRegion="polite" style={styles.help}>{status}</Text> : null}
    <Pressable style={styles.button} disabled={busy || !loaded} onPress={() => void save()}><Text style={styles.buttonText}>{busy ? 'SPRAWDZANIE…' : 'ZAPISZ I SPRAWDŹ'}</Text></Pressable>
    <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>WRÓĆ DO JARVIS</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#05070a'},container:{padding:24,gap:12},kicker:{color:'#7e8b9a',letterSpacing:2,fontSize:11},
  title:{color:'#f4f7fb',fontSize:34,fontWeight:'700',marginBottom:18},label:{color:'#8e9baa',fontSize:11,letterSpacing:1.2,marginTop:8},
  input:{borderWidth:1,borderColor:'#354352',color:'#f4f7fb',padding:14,minHeight:52},help:{color:'#aeb9c5',fontSize:13,lineHeight:20},
  button:{borderWidth:1,borderColor:'#59697a',padding:16,alignItems:'center',marginTop:10},buttonText:{color:'#f4f7fb',fontWeight:'700',letterSpacing:1},
  back:{padding:14,alignItems:'center'},backText:{color:'#8e9baa',letterSpacing:1}
});
