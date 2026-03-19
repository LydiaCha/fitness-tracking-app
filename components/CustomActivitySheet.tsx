import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput, ScrollView,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '@/context/ThemeContext';
import { CustomActivity } from '@/utils/customActivities';
import { DAY_NAMES } from '@/constants/userProfile';

export const CUSTOM_EMOJI_OPTIONS = [
  '🎸','📚','🎨','🧗','🐕','🧹','🎯','🌱',
  '📝','🎮','🎤','🏃','🤸','🧩','🚴','☕',
  '🛁','🎭','🪴','🎻','🏊','🎬','🌿','🧘',
];

const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function timeStrToDate(str: string): Date {
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return new Date();
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const pm = match[3].toUpperCase() === 'PM';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeStr(date: Date): string {
  const h24 = date.getHours();
  const m = date.getMinutes();
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function daysLabel(daysOfWeek: number[]): string {
  if (daysOfWeek.length === 7) return 'Every day';
  if (daysOfWeek.length === 0) return 'No days set';
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  return sorted.map(d => DAY_NAMES[d]).join(' · ');
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (a: Omit<CustomActivity, 'id'> & { id?: string }) => void;
  editing?: CustomActivity;
}

export function CustomActivitySheet({ visible, onClose, onSave, editing }: Props) {
  const { theme } = useAppTheme();

  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState('9:00 AM');
  const [durationMin, setDurationMin] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setLabel(editing.label);
      setEmoji(editing.emoji);
      setDays(editing.daysOfWeek);
      setTime(editing.time);
      setDurationMin(editing.durationMin ? String(editing.durationMin) : '');
    } else {
      setLabel('');
      setEmoji('🎯');
      setDays([]);
      setTime('9:00 AM');
      setDurationMin('');
    }
  }, [editing, visible]);

  const toggleDay = (d: number) =>
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b));

  const canSave = label.trim().length > 0 && days.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: editing?.id,
      label: label.trim(),
      emoji,
      daysOfWeek: days,
      time,
      durationMin: durationMin ? parseInt(durationMin, 10) : undefined,
    });
  };

  const labelStyle = {
    fontSize: 11, fontWeight: '700' as const,
    color: theme.textMuted, textTransform: 'uppercase' as const,
    letterSpacing: 0.8, marginBottom: 8,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#00000055' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{
          backgroundColor: theme.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 }} />

          <Text style={{ fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 20 }}>
            {editing ? 'Edit Activity' : 'New Activity'}
          </Text>

          {/* Emoji picker */}
          <Text style={labelStyle}>Icon</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
            contentContainerStyle={{ gap: 8 }}>
            {CUSTOM_EMOJI_OPTIONS.map((e, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setEmoji(e)}
                style={{
                  width: 46, height: 46, borderRadius: 12,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: emoji === e ? theme.primary + '22' : theme.bgCardAlt,
                  borderWidth: 1.5,
                  borderColor: emoji === e ? theme.primary : theme.border,
                }}
                activeOpacity={0.7}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Name */}
          <Text style={labelStyle}>Name</Text>
          <TextInput
            style={{
              backgroundColor: theme.bgCardAlt, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 13,
              fontSize: 16, fontWeight: '600', color: theme.textPrimary,
              borderWidth: 1, borderColor: theme.border, marginBottom: 20,
            }}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Guitar practice"
            placeholderTextColor={theme.textMuted}
            returnKeyType="done"
            maxLength={30}
          />

          {/* Days */}
          <Text style={labelStyle}>Repeats on</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
            {DAY_SHORT.map((d, i) => {
              const on = days.includes(i);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleDay(i)}
                  style={{
                    flex: 1, aspectRatio: 1, borderRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5,
                    backgroundColor: on ? theme.primary + '22' : theme.bgCard,
                    borderColor: on ? theme.primary : theme.border,
                  }}
                  activeOpacity={0.7}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: on ? theme.primary : theme.textMuted }}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time + Duration */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Time</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={{
                  backgroundColor: theme.bgCardAlt, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 14,
                  borderWidth: 1, borderColor: theme.border, alignItems: 'center',
                }}
                activeOpacity={0.7}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.primary }}>{time}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Duration (min)</Text>
              <TextInput
                style={{
                  backgroundColor: theme.bgCardAlt, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 13,
                  fontSize: 15, fontWeight: '700', color: theme.textPrimary,
                  borderWidth: 1, borderColor: theme.border, textAlign: 'center',
                }}
                value={durationMin}
                onChangeText={v => setDurationMin(v.replace(/\D/g, ''))}
                placeholder="—"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={canSave ? 0.8 : 1}
            style={{
              backgroundColor: canSave ? theme.primary : theme.bgCardAlt,
              borderRadius: 14, paddingVertical: 15, alignItems: 'center',
            }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: canSave ? '#fff' : theme.textMuted }}>
              {editing ? 'Save Changes' : 'Add Activity'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* iOS time picker */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setShowTimePicker(false)}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          />
          <View style={{ backgroundColor: theme.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.primary, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={timeStrToDate(time)}
              mode="time"
              display="spinner"
              is24Hour={false}
              onChange={(_, d) => { if (d) setTime(dateToTimeStr(d)); }}
              style={{ height: 180 }}
            />
          </View>
        </Modal>
      )}
      {/* Android time picker */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={timeStrToDate(time)}
          mode="time"
          is24Hour={false}
          onChange={(_, d) => { setShowTimePicker(false); if (d) setTime(dateToTimeStr(d)); }}
        />
      )}
    </Modal>
  );
}
