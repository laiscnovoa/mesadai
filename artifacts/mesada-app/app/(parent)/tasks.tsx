import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Task, TaskFrequency, formatCurrency } from '@/types';

const FREQ_OPTIONS: { label: string; value: TaskFrequency; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Diária', value: 'daily', icon: 'sunny' },
  { label: 'Semanal', value: 'weekly', icon: 'calendar' },
  { label: 'Uma vez', value: 'once', icon: 'checkmark-done-circle' },
];

const REWARD_PRESETS = [500, 1000, 2000, 5000];

export default function TasksScreen() {
  const { tasks, addTask, toggleTask, deleteTask } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardStr, setRewardStr] = useState('');
  const [frequency, setFrequency] = useState<TaskFrequency>('daily');

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const openCreate = () => {
    setEditTask(null);
    setTitle('');
    setDescription('');
    setRewardStr('');
    setFrequency('daily');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Atenção', 'Digite o nome da tarefa.'); return; }
    const reward = Math.round(parseFloat(rewardStr.replace(',', '.')) * 100);
    if (isNaN(reward) || reward <= 0) { Alert.alert('Atenção', 'Digite um valor válido.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask({ title: title.trim(), description: description.trim(), rewardCents: reward, frequency });
    setShowModal(false);
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Remover tarefa', `Remover "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const activeTasks = tasks.filter(t => t.active);
  const inactiveTasks = tasks.filter(t => !t.active);

  const renderTask = ({ item }: { item: Task }) => (
    <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.active ? 1 : 0.6 }]}>
      <View style={[styles.taskIcon, { backgroundColor: item.active ? colors.secondary : colors.muted }]}>
        <Ionicons name={FREQ_OPTIONS.find(f => f.value === item.frequency)?.icon ?? 'checkmark'} size={20} color={item.active ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.taskMeta}>
          <Text style={[styles.taskFreq, { color: colors.mutedForeground }]}>
            {FREQ_OPTIONS.find(f => f.value === item.frequency)?.label}
          </Text>
          <View style={[styles.rewardBadge, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="cash" size={12} color="#F6C90E" />
            <Text style={styles.rewardText}>{formatCurrency(item.rewardCents)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity onPress={() => toggleTask(item.id)} style={styles.actionBtn}>
          <Ionicons name={item.active ? 'pause-circle' : 'play-circle'} size={24} color={item.active ? colors.warning : colors.success} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tarefas</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...activeTasks, ...inactiveTasks]}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 100 },
        ]}
        ListHeaderComponent={
          tasks.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {activeTasks.length} ativa{activeTasks.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="list" size={56} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma tarefa</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Crie tarefas para o(a) seu(ua) filho(a) completar.
            </Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.emptyBtnText}>Criar primeira tarefa</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={renderTask}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Task Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={[styles.cancelText, { color: colors.destructive }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nova Tarefa</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.saveText, { color: colors.primary }]}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome da tarefa</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Lavar a louça"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Detalhes da tarefa..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Valor (R$)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: 5,00"
              placeholderTextColor={colors.mutedForeground}
              value={rewardStr}
              onChangeText={setRewardStr}
              keyboardType="decimal-pad"
            />
            <View style={styles.presets}>
              {REWARD_PRESETS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={() => setRewardStr((p / 100).toFixed(2).replace('.', ','))}
                >
                  <Text style={[styles.presetText, { color: colors.secondaryForeground }]}>{formatCurrency(p)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Frequência</Text>
            {FREQ_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.freqOption, {
                  backgroundColor: frequency === opt.value ? colors.primary : colors.card,
                  borderColor: frequency === opt.value ? colors.primary : colors.border,
                }]}
                onPress={() => setFrequency(opt.value)}
              >
                <Ionicons name={opt.icon} size={20} color={frequency === opt.value ? '#ffffff' : colors.foreground} />
                <Text style={[styles.freqLabel, { color: frequency === opt.value ? '#ffffff' : colors.foreground }]}>{opt.label}</Text>
                {frequency === opt.value && <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={styles.freqCheck} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 16, marginBottom: 8, opacity: 0.7 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
    marginHorizontal: 16, marginVertical: 5, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  taskIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  taskInfo: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskFreq: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rewardText: { fontSize: 12, fontWeight: '600' as const, color: '#B7860B', fontFamily: 'Inter_600SemiBold' },
  taskActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20, borderBottomWidth: 1,
  },
  cancelText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  modalTitle: { fontSize: 17, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  saveText: { fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  modalContent: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  presets: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  presetText: { fontSize: 13, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  freqOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1.5, gap: 12,
  },
  freqLabel: { flex: 1, fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  freqCheck: { marginLeft: 'auto' },
});
