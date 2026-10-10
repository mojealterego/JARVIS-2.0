import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { api, type MemoryEntry } from '../lib/api';

export default function MemoryScreen() {
  const [items, setItems] = useState<MemoryEntry[]>([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (search = '') => {
    try {
      setLoading(true);
      setError('');
      const found = search.trim()
        ? (await api.searchMemory(search.trim())).results
        : await api.memory();
      setItems(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd połączenia z pamięcią');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!text.trim() || saving) return;
    try {
      setSaving(true);
      await api.remember(text.trim());
      setText('');
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się zapisać informacji');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (busyId) return;
    try {
      setBusyId(id);
      await api.deleteMemory(id);
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się usunąć informacji');
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(id: string) {
    Alert.alert('Usuń wspomnienie', 'Tej operacji nie można cofnąć.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => void remove(id) },
    ]);
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Wróć">
          <Text style={s.back}>‹</Text>
        </Pressable>
        <View>
          <Text style={s.kicker}>JARVIS OMEGA INFINITY / PAMIĘĆ</Text>
          <Text style={s.title}>Pamięć</Text>
        </View>
      </View>
      <View style={s.composer}>
        <TextInput value={text} onChangeText={setText} placeholder="Co mam zapamiętać?"
          placeholderTextColor="#6d7885" style={s.input} accessibilityLabel="Nowe wspomnienie" />
        <Pressable disabled={saving || !text.trim()} onPress={() => void save()} style={s.add} accessibilityRole="button" accessibilityLabel="Zapisz wspomnienie">
          <Text style={s.addText}>{saving ? '…' : '+'}</Text>
        </Pressable>
      </View>
      <View style={s.search}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Szukaj w pamięci"
          placeholderTextColor="#6d7885" style={s.searchInput} onSubmitEditing={() => void load(query)}
          returnKeyType="search" accessibilityLabel="Wyszukaj wspomnienia" />
        <Pressable onPress={() => void load(query)} style={s.searchButton} accessibilityRole="button" accessibilityLabel="Szukaj">
          <Text style={s.searchButtonText}>Szukaj</Text>
        </Pressable>
        {query.length > 0 ? <Pressable onPress={() => { setQuery(''); void load(''); }} accessibilityRole="button" accessibilityLabel="Wyczyść wyszukiwanie">
          <Text style={s.clear}>×</Text>
        </Pressable> : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginTop: 30 }} /> : (
        <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={s.list}
          refreshing={loading} onRefresh={() => void load(query)}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.body}>{item.content}</Text>
              <View style={s.cardFooter}>
                <Text style={s.meta}>{item.createdAt}</Text>
                <Pressable disabled={busyId !== null} onPress={() => confirmDelete(item.id)}
                  accessibilityRole="button" accessibilityLabel="Usuń wspomnienie">
                  <Text style={s.delete}>Usuń</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>{query.trim() ? 'Brak wyników wyszukiwania.' : 'Pamięć jest pusta.'}</Text>}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05070a', paddingTop: 54 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 18 },
  back: { fontSize: 42, color: '#dce6f0', marginRight: 14, lineHeight: 42 },
  kicker: { fontSize: 10, letterSpacing: 1.5, color: '#657585' },
  title: { fontSize: 28, fontWeight: '700', color: '#f3f7fb' },
  composer: { marginHorizontal: 20, flexDirection: 'row', backgroundColor: '#0c1118', borderWidth: 1, borderColor: '#1b2633', borderRadius: 14, padding: 6 },
  input: { flex: 1, color: '#fff', paddingHorizontal: 12, fontSize: 16 },
  add: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#182635' },
  addText: { color: '#fff', fontSize: 28 },
  search: { marginHorizontal: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#1b2633', backgroundColor: '#0c1118', paddingHorizontal: 12 },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 12 },
  searchButton: { padding: 10 },
  searchButtonText: { color: '#72c8ff', fontWeight: '600' },
  clear: { fontSize: 26, color: '#9cabb9', paddingLeft: 8 },
  list: { padding: 20, gap: 10 },
  card: { backgroundColor: '#0c1118', borderColor: '#1b2633', borderWidth: 1, borderRadius: 14, padding: 16 },
  body: { color: '#f1f5f9', fontSize: 15, lineHeight: 21 },
  cardFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: '#657585', fontSize: 11, flexShrink: 1 },
  delete: { color: '#ff8585', padding: 8, fontWeight: '600' },
  empty: { color: '#657585', textAlign: 'center', marginTop: 30 },
  error: { color: '#ff7b7b', paddingHorizontal: 20, paddingTop: 10, fontSize: 12 },
});
