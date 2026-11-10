import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Button, Callout, Card, FieldError } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { makeId } from '@/features/planner/engine';
import { useProfileStore } from '@/features/profile/store';
import { ScanError, analyzePhotos } from '@/features/scanner/api';
import { useScanStore } from '@/features/scanner/store';
import { fmtDate } from '@/features/tracker/format';

type Side = 'front' | 'back';

const TIPS = [
  'Fitted clothing or swimwear, so muscle shape is visible.',
  'Whole body in frame, head to feet, standing straight and relaxed.',
  'Arms slightly away from your sides.',
  'Good, even light and a plain background.',
  'Camera at chest height, about 2 m (6 ft) away — a timer or a friend helps.',
];

export default function ScanHome() {
  const profile = useProfileStore((s) => s.profile);
  const scans = useScanStore((s) => s.scans);
  const add = useScanStore((s) => s.add);
  const [step, setStep] = useState<'intro' | 'photos'>('intro');
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<Record<Side, string | null>>({ front: null, back: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!profile) return <Redirect href="/" />;

  const pick = async (side: Side, source: 'camera' | 'library') => {
    setError(undefined);
    if (source === 'camera' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Camera access is off. Allow it in Settings, or choose a photo instead.');
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setPhotos({ ...photos, [side]: result.assets[0].uri });
  };

  const analyze = async () => {
    if (!photos.front || !photos.back) return setError('Add both a front and a back photo.');
    setBusy(true);
    setError(undefined);
    try {
      const analysis = await analyzePhotos(photos.front, photos.back, profile);
      const record = { id: makeId('scan'), takenAt: new Date().toISOString(), analysis };
      add(record);
      setPhotos({ front: null, back: null }); // photos are discarded once analyzed
      router.replace({ pathname: '/scan/[scanId]', params: { scanId: record.id } });
    } catch (e) {
      setError(e instanceof ScanError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'intro')
    return (
      <Screen
        footer={
          <View style={{ gap: Spacing.sm }}>
            <FieldError message={error} />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button label="Back" variant="secondary" onPress={() => goBack('/')} style={{ flex: 1 }} />
              <Button
                label="Continue"
                onPress={() => (consent ? setStep('photos') : setError('Confirm the consent box to continue.'))}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        }>
        <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
          <AppText variant="title">Physique scan</AppText>
          <AppText tone="secondary">
            Two photos — front and back — show which muscle groups are ahead and which are behind. Your plan
            then prioritizes what&apos;s lagging and keeps everything else balanced.
          </AppText>
        </View>

        {scans.length ? (
          <Card style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
            <AppText variant="label">Past scans</AppText>
            {[...scans].reverse().map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/scan/[scanId]', params: { scanId: s.id } })}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs }}>
                <AppText variant="small">{fmtDate(s.takenAt)}</AppText>
                <AppText variant="small" tone="accent">
                  {s.analysis.quality.usable ? 'View results ›' : 'Photos unusable ›'}
                </AppText>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <AppText variant="label" style={{ marginBottom: Spacing.sm }}>
          For an accurate scan
        </AppText>
        <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
          {TIPS.map((t) => (
            <AppText key={t} variant="small" tone="secondary">
              • {t}
            </AppText>
          ))}
        </View>

        <Callout tone="info">
          <AppText variant="label">Your privacy</AppText>
          <AppText variant="small" tone="secondary">
            Photos are sent securely to Anthropic&apos;s Claude AI for a one-time analysis. This app doesn&apos;t keep
            them — not on our server, not on this device; only the written results are saved here. Anthropic
            handles API data under its own retention policy. Results are estimates, not a medical or
            body-composition assessment.
          </AppText>
        </Callout>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          onPress={() => {
            setConsent(!consent);
            setError(undefined);
          }}
          style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.lg }}>
          <View style={[styles.box, consent && { backgroundColor: Colors.accent, borderColor: Colors.accent }]}>
            {consent ? <AppText style={{ color: Colors.onAccent }}>✓</AppText> : null}
          </View>
          <AppText style={{ flex: 1 }}>I&apos;m 18 or older and agree to send my photos for analysis</AppText>
        </Pressable>
      </Screen>
    );

  return (
    <Screen
      footer={
        <View style={{ gap: Spacing.sm }}>
          <FieldError message={error} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Back" variant="secondary" onPress={() => !busy && setStep('intro')} style={{ flex: 1 }} />
            <Button label={busy ? 'Analyzing…' : 'Analyze photos'} onPress={() => !busy && analyze()} style={{ flex: 2 }} />
          </View>
        </View>
      }>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">Add your photos</AppText>
        <AppText tone="secondary">Same pose for both: standing tall, relaxed, arms slightly out.</AppText>
      </View>

      {busy ? (
        <Card style={{ alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
          <ActivityIndicator color={Colors.accent} />
          <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
            Analyzing your physique. This usually takes under a minute.
          </AppText>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        {(['front', 'back'] as Side[]).map((side) => (
          <View key={side} style={{ flex: 1, gap: Spacing.sm }}>
            <AppText variant="label">{side === 'front' ? 'Front' : 'Back'}</AppText>
            <View style={styles.slot}>
              {photos[side] ? (
                <Image source={{ uri: photos[side]! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <AppText variant="small" tone="muted" style={{ textAlign: 'center', padding: Spacing.md }}>
                  {side === 'front' ? 'Facing the camera' : 'Back to the camera'}
                </AppText>
              )}
            </View>
            <Button label={photos[side] ? 'Retake' : 'Take photo'} variant="secondary" onPress={() => pick(side, 'camera')} />
            <Button label="Choose photo" variant="ghost" onPress={() => pick(side, 'library')} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = {
  box: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm - 2,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  slot: {
    aspectRatio: 3 / 5,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
};
