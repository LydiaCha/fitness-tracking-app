import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { Gender } from '@/constants/userProfile';

const TOTAL_STEPS = 7;

function cmToFtIn(cm: string): { ft: string; inches: string } {
  const val = parseFloat(cm);
  if (!cm || isNaN(val)) return { ft: '', inches: '' };
  const totalIn = val / 2.54;
  return { ft: String(Math.floor(totalIn / 12)), inches: String(Math.round(totalIn % 12)) };
}

function ftInToCm(ft: string, inches: string): string {
  const f = parseFloat(ft) || 0;
  const i = parseFloat(inches) || 0;
  if (!ft && !inches) return '';
  return String(Math.round((f * 12 + i) * 2.54));
}

function kgToLbs(kg: string): string {
  const val = parseFloat(kg);
  if (!kg || isNaN(val)) return '';
  return String(Math.round(val * 2.20462 * 10) / 10);
}

function lbsToKg(lbs: string): string {
  const val = parseFloat(lbs);
  if (!lbs || isNaN(val)) return '';
  return String(Math.round((val / 2.20462) * 10) / 10);
}

export default function Step3() {
  const { theme } = useAppTheme();
  const { data, update } = useOnboarding();
  const router = useRouter();

  const [age,         setAge]         = useState(data.age);
  const [heightUnit,  setHeightUnit]  = useState<'cm' | 'ft'>('cm');
  const [weightUnit,  setWeightUnit]  = useState<'kg' | 'lbs'>('kg');

  // Local display state for ft/in
  const [ftVal,     setFtVal]     = useState(() => cmToFtIn(data.heightCm).ft);
  const [inchesVal, setInchesVal] = useState(() => cmToFtIn(data.heightCm).inches);
  // Local display state for lbs
  const [lbsVal,    setLbsVal]    = useState(() => kgToLbs(data.weightKg));

  const canContinue = data.gender && age && data.heightCm && data.weightKg;

  const setGender = (g: Gender) => update({ gender: g });

  const onSwitchHeightUnit = (unit: 'cm' | 'ft') => {
    if (unit === heightUnit) return;
    if (unit === 'ft') {
      const { ft, inches } = cmToFtIn(data.heightCm);
      setFtVal(ft);
      setInchesVal(inches);
    }
    setHeightUnit(unit);
  };

  const onSwitchWeightUnit = (unit: 'kg' | 'lbs') => {
    if (unit === weightUnit) return;
    if (unit === 'lbs') setLbsVal(kgToLbs(data.weightKg));
    setWeightUnit(unit);
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={s.progressRow}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View key={i} style={[s.progressDot, i <= 2 && s.progressDotActive]} />
            ))}
          </View>

          <Text style={s.emoji}>📏</Text>
          <Text style={s.heading}>Body stats</Text>
          <Text style={s.sub}>Used to calculate your personalised targets.</Text>

          {/* Gender */}
          <Text style={s.fieldLabel}>Biological sex</Text>
          <View style={s.pillRow}>
            {(['female', 'male', 'other'] as Gender[]).map(g => (
              <TouchableOpacity
                key={g}
                style={[s.pill, data.gender === g && s.pillActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[s.pillText, data.gender === g && s.pillTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Age */}
          <Text style={s.fieldLabel}>Age</Text>
          <TextInput
            style={s.input}
            value={age}
            onChangeText={v => { setAge(v); update({ age: v }); }}
            placeholder="e.g. 28"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            maxLength={3}
          />

          {/* Height */}
          <View style={s.labelRow}>
            <Text style={s.fieldLabel}>Height</Text>
            <View style={s.unitToggle}>
              {(['cm', 'ft'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[s.unitBtn, heightUnit === u && s.unitBtnActive]}
                  onPress={() => onSwitchHeightUnit(u)}
                >
                  <Text style={[s.unitBtnText, heightUnit === u && s.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {heightUnit === 'cm' ? (
            <TextInput
              style={s.input}
              value={data.heightCm}
              onChangeText={v => update({ heightCm: v })}
              placeholder="e.g. 165"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              maxLength={5}
            />
          ) : (
            <View style={s.ftRow}>
              <TextInput
                style={[s.input, s.ftInput]}
                value={ftVal}
                onChangeText={v => {
                  setFtVal(v);
                  update({ heightCm: ftInToCm(v, inchesVal) });
                }}
                placeholder="ft"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={1}
              />
              <Text style={s.ftSep}>ft</Text>
              <TextInput
                style={[s.input, s.ftInput]}
                value={inchesVal}
                onChangeText={v => {
                  setInchesVal(v);
                  update({ heightCm: ftInToCm(ftVal, v) });
                }}
                placeholder="in"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={s.ftSep}>in</Text>
            </View>
          )}

          {/* Weight */}
          <View style={s.labelRow}>
            <Text style={s.fieldLabel}>Weight</Text>
            <View style={s.unitToggle}>
              {(['kg', 'lbs'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[s.unitBtn, weightUnit === u && s.unitBtnActive]}
                  onPress={() => onSwitchWeightUnit(u)}
                >
                  <Text style={[s.unitBtnText, weightUnit === u && s.unitBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {weightUnit === 'kg' ? (
            <TextInput
              style={s.input}
              value={data.weightKg}
              onChangeText={v => update({ weightKg: v })}
              placeholder="e.g. 62"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              maxLength={5}
            />
          ) : (
            <TextInput
              style={s.input}
              value={lbsVal}
              onChangeText={v => {
                setLbsVal(v);
                update({ weightKg: lbsToKg(v) });
              }}
              placeholder="e.g. 137"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          )}

          <View style={s.footer}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, !canContinue && s.nextBtnDisabled]}
              onPress={() => router.push('/(onboarding)/step-4')}
              disabled={!canContinue}
            >
              <Text style={s.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  progressRow: { flexDirection: 'row', gap: 6, paddingTop: 20, paddingBottom: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  progressDotActive: { backgroundColor: theme.primary },
  emoji:      { fontSize: 48, marginTop: 16 },
  heading:    { fontSize: 26, fontWeight: '700', color: theme.textPrimary, marginTop: 8 },
  sub:        { fontSize: 16, color: theme.textMuted, lineHeight: 22, marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: theme.textMuted, marginBottom: 8 },
  pillRow:    { flexDirection: 'row', gap: 10, marginBottom: 20 },
  pill: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillActive:     { borderColor: theme.primary },
  pillText:       { color: theme.textMuted, fontSize: 15, fontWeight: '500' },
  pillTextActive: { color: theme.primary, fontWeight: '700' },
  input: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  labelRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  unitToggle:      { flexDirection: 'row', backgroundColor: theme.bgCard, borderRadius: 8, overflow: 'hidden' },
  unitBtn:         { paddingHorizontal: 12, paddingVertical: 4 },
  unitBtnActive:   { backgroundColor: theme.primary, borderRadius: 8 },
  unitBtnText:     { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  unitBtnTextActive: { color: '#fff' },
  ftRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  ftInput:         { flex: 1, marginBottom: 0 },
  ftSep:           { fontSize: 16, color: theme.textMuted, marginBottom: 0 },
  footer:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  backText:         { color: theme.textMuted, fontSize: 15 },
  nextBtn:          { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnDisabled:  { opacity: 0.4 },
  nextBtnText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
});
