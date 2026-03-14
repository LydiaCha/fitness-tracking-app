/**
 * In-app feedback form.
 *
 * Supabase setup (run once in your Supabase SQL editor):
 *
 *   create table feedback (
 *     id         uuid primary key default gen_random_uuid(),
 *     user_id    uuid references auth.users,
 *     rating     int,
 *     message    text not null,
 *     created_at timestamptz default now()
 *   );
 *   alter table feedback enable row level security;
 *   create policy "insert own feedback" on feedback
 *     for insert with check (auth.uid() = user_id);
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';
import { isNetworkError } from '@/utils/errorMessages';

const STARS = [1, 2, 3, 4, 5];

export default function FeedbackScreen() {
  const { theme }  = useAppTheme();
  const { user }   = useAuth();
  const router     = useRouter();

  const [rating,  setRating]  = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const canSubmit = message.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id ?? null,
        rating:  rating || null,
        message: message.trim(),
      });
      if (error) throw error;
      logger.info('network', 'feedback_submit', 'Feedback submitted successfully');
      setDone(true);
    } catch (e) {
      logger.error('network', 'feedback_submit', 'Feedback submission failed', {
        error: String((e as any)?.message ?? e),
      });
      const msg = isNetworkError(e)
        ? 'No internet connection. Please try again when you\'re online.'
        : 'Your feedback was not saved. Please try again later.';
      Alert.alert('Could not submit', msg);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  if (done) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.doneWrap}>
          <Text style={s.doneIcon}>🙏</Text>
          <Text style={s.doneTitle}>Thank you!</Text>
          <Text style={s.doneSub}>Your feedback helps make the app better.</Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.heading}>Send feedback</Text>
          <Text style={s.sub}>What's working well? What could be better?</Text>

          {/* Star rating */}
          <Text style={s.label}>Rating (optional)</Text>
          <View style={s.starsRow}>
            {STARS.map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n === rating ? 0 : n)} hitSlop={8}>
                <Text style={[s.star, n <= rating && s.starFilled]}>
                  {n <= rating ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={s.label}>Your message</Text>
          <TextInput
            style={s.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what you think..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={s.charCount}>{message.length} / 1000</Text>

          <TouchableOpacity
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnText}>Submit feedback</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  header:  { paddingTop: 16, paddingBottom: 8 },
  backText:{ color: theme.primary, fontSize: 16 },
  heading: { fontSize: 28, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
  sub:     { fontSize: 15, color: theme.textPrimaryMuted, lineHeight: 22, marginBottom: 28 },
  label:   { fontSize: 14, fontWeight: '500', color: theme.textPrimaryMuted, marginBottom: 10 },
  starsRow:{ flexDirection: 'row', gap: 8, marginBottom: 28 },
  star:    { fontSize: 36, color: theme.border },
  starFilled: { color: '#f59e0b' },
  textArea: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 140,
    marginBottom: 6,
  },
  charCount: { fontSize: 12, color: theme.textPrimaryMuted, textAlign: 'right', marginBottom: 24 },
  submitBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText:     { color: '#fff', fontSize: 17, fontWeight: '600' },
  // Done
  doneWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  doneIcon:  { fontSize: 64 },
  doneTitle: { fontSize: 26, fontWeight: '700', color: theme.textPrimary },
  doneSub:   { fontSize: 16, color: theme.textPrimaryMuted, textAlign: 'center' },
  doneBtn:   { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36, marginTop: 8 },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
