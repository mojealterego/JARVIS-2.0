import { useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text } from 'react-native';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import * as Speech from 'expo-speech';
import { transcribe } from '../lib/api';

export function VoiceButton({ onText, disabled = false }: { onText: (text: string) => void; disabled?: boolean }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function toggle() {
    if (lock.current || (disabled && !state.isRecording)) return;
    lock.current = true;
    setBusy(true);
    try {
      if (!recorder.isRecording) {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) throw new Error('Zezwól aplikacji na używanie mikrofonu w ustawieniach Androida.');
        await Speech.stop();
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        if (AppState.currentState !== 'active') return;
        await recorder.prepareToRecordAsync();
        recorder.record();
      } else {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        if (!recorder.uri) throw new Error('Nie udało się zapisać nagrania.');
        const result = await transcribe(recorder.uri);
        if (!result.text.trim()) throw new Error('Nie rozpoznano mowy. Spróbuj ponownie.');
        onText(result.text.trim());
      }
    } catch (error) {
      Alert.alert('Polecenie głosowe', error instanceof Error ? error.message : 'Nie udało się nagrać polecenia.');
    } finally { lock.current = false; setBusy(false); }
  }

  return <Pressable accessibilityRole="button" accessibilityLabel="Polecenie głosowe"
    disabled={busy || (disabled && !state.isRecording)}
    style={[styles.button, state.isRecording && styles.active, busy && styles.busy]} onPress={() => void toggle()}>
    <Text style={styles.text}>{busy ? 'PRZETWARZANIE…' : state.isRecording ? 'ZATRZYMAJ I ROZPOZNAJ' : 'POLECENIE GŁOSOWE'}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderColor: '#4b5a69', padding: 16, alignItems: 'center' },
  active: { borderColor: '#d9a441' },
  busy: { opacity: 0.6 },
  text: { color: '#f4f7fb', fontWeight: '700', letterSpacing: 1.2 }
});
