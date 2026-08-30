import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Task, TaskFrequency, TaskAssignmentType, formatCurrency } from '@/types';
import { AppSheet } from '@/components/AppSheet';
import { bottomInset, cardShadow, layout, topInset } from '@/constants/layout';

const FREQ_OPTIONS: { label: string; value: TaskFrequency; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Diária', value: 'daily', icon: 'sunny' },
  { label: 'Semanal', value: 'weekly', icon: 'calendar' },
  { label: 'Uma vez', value: 'once', icon: 'checkmark-done-circle' },
];

const ASSIGN_OPTIONS: { label: string; value: TaskAssignmentType; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { label: 'Todos', value: 'all', icon: 'people', description: 'Todos os filhos precisam completar' },
  { label: 'Individual', value: 'individual', icon: 'person', description: 'Só filhos selecionados' },
  { label: 'Livre', value: 'first', icon: 'flash', description: 'Primeiro a completar ganha' },
];

const REWARD_PRESETS = [500, 1000, 2000, 5000];

const ASSIGNMENT_LABELS: Record<TaskAssignmentType, string> = {
  all: 'Todos',
  individual: 'Individual',
  first: 'Livre',
};

const ASSIGNMENT_ICONS: Record<TaskAssignmentType, keyof typeof Ionicons.glyphMap> = {
  all: 'people',
  individual: 'person',
  first: 'flash',
};

export default function TasksScreen() {
  const { tasks, children, addTask, toggleTask, deleteTask, updateTask, isTaskClaimedForCycle } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardStr, setRewardStr] = useState('');
  const [frequency, setFrequency] = useState<TaskFrequency>('daily');
  const [assignmentType, setAssignmentType] = useState<TaskAssignmentType>('all');
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  const topPad = topInset(insets.top);
  const assignmentColors: Record<TaskAssignmentType, string> = {
    all: colors.success,
    individual: colors.info,
    first: colors.warning,
  };

  const openCreate = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setRewardStr('');
    setFrequency('daily');
    setAssignmentType('all');
    setSelectedChildIds([]);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description ?? '');
    setRewardStr((task.rewardCents / 100).toFixed(2).replace('.', ','));
    setFrequency(task.frequency);
    setAssignmentType(task.assignmentType ?? 'all');
    setSelectedChildIds(task.assignedChildIds ?? []);
    setShowModal(true);
  };

  const toggleChild = (childId: string) => {
    setSelectedChildIds(prev =>
      prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
    );
  };

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Atenção', 'Digite o nome da tarefa.'); return; }
    const reward = Math.round(parseFloat(rewardStr.replace(',', '.')) * 100);
    if (isNaN(reward) || reward <= 0) { Alert.alert('Atenção', 'Digite um valor válido.'); return; }
    if (assignmentType === 'individual' && selectedChildIds.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um filho para a tarefa individual.'); return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingTask) {
      updateTask({
        ...editingTask,
        title: title.trim(),
        description: description.trim(),
        rewardCents: reward,
        frequency,
        assignmentType,
        assignedChildIds: assignmentType === 'individual' ? selectedChildIds : [],
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim(),
        rewardCents: reward,
        frequency,
        assignmentType,
        assignedChildIds: assignmentType === 'individual' ? selectedChildIds : [],
      });
    }
    setShowModal(false);
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Remover tarefa', `Remover "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  };

  const getAssignmentLabel = (task: Task): string => {
    const aType = task.assignmentType ?? 'all';
    if (aType === 'individual') {
      const names = (task.assignedChildIds ?? [])
        .map(id => children.find(c => c.id === id)?.name ?? '')
        .filter(Boolean);
      if (names.length === 0) return 'Individual';
      return names.length <= 2 ? names.join(', ') : `${names[0]} +${names.length - 1}`;
    }
    return ASSIGNMENT_LABELS[aType];
  };

  const activeTasks = tasks.filter(t => t.active);
  const inactiveTasks = tasks.filter(t => !t.active);

  const renderTask = ({ item }: { item: Task }) => {
    const aType = item.assignmentType ?? 'all';
    const claimed = aType === 'first' && isTaskClaimedForCycle(item.id);
    const badgeColor = assignmentColors[aType];
    return (
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
            <View style={[styles.assignBadge, { backgroundColor: badgeColor + '20' }]}>
              <Ionicons name={ASSIGNMENT_ICONS[aType]} size={11} color={badgeColor} />
              <Text style={[styles.assignBadgeText, { color: badgeColor }]}>{getAssignmentLabel(item)}</Text>
              {claimed && <Text style={[styles.assignBadgeText, { color: badgeColor }]}>· Conquistada</Text>}
            </View>
            <View style={[styles.rewardBadge, { backgroundColor: colors.rewardBackground }]}>
              <Ionicons name="cash" size={12} color={colors.accent} />
              <Text style={[styles.rewardText, { color: colors.rewardForeground }]}>{formatCurrency(item.rewardCents)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.taskActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={21} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => toggleTask(item.id)} style={styles.actionBtn}>
            <Ionicons name={item.active ? 'pause-circle' : 'play-circle'} size={24} color={item.active ? colors.warning : colors.success} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          { paddingBottom: bottomInset(insets.bottom) + 100 },
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

      <AppSheet
        visible={showModal}
        title={editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
        onClose={() => setShowModal(false)}
        actionLabel="Salvar"
        onAction={handleSave}
      >
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

            {/* Assignment Type */}
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Quem deve fazer?</Text>
            {ASSIGN_OPTIONS.map(opt => {
              const selected = assignmentType === opt.value;
              const aColor = assignmentColors[opt.value];
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.assignOption, {
                    backgroundColor: selected ? aColor + '15' : colors.card,
                    borderColor: selected ? aColor : colors.border,
                  }]}
                  onPress={() => setAssignmentType(opt.value)}
                >
                  <View style={[styles.assignOptionIcon, { backgroundColor: selected ? aColor : colors.muted }]}>
                    <Ionicons name={opt.icon} size={18} color={selected ? '#ffffff' : colors.mutedForeground} />
                  </View>
                  <View style={styles.assignOptionText}>
                    <Text style={[styles.assignOptionLabel, { color: selected ? aColor : colors.foreground }]}>{opt.label}</Text>
                    <Text style={[styles.assignOptionDesc, { color: colors.mutedForeground }]}>{opt.description}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={aColor} />}
                </TouchableOpacity>
              );
            })}

            {/* Child selector — only for 'individual' */}
            {assignmentType === 'individual' && children.length > 0 && (
              <>
                <Text style={[styles.childPickerLabel, { color: colors.mutedForeground }]}>
                  Selecione os filhos:
                </Text>
                {children.map(child => {
                  const picked = selectedChildIds.includes(child.id);
                  return (
                    <TouchableOpacity
                      key={child.id}
                      style={[styles.childRow, {
                        backgroundColor: picked ? colors.successBackground : colors.card,
                        borderColor: picked ? colors.info : colors.border,
                      }]}
                      onPress={() => toggleChild(child.id)}
                    >
                      <View style={[styles.childAvatar, { backgroundColor: picked ? colors.info : colors.muted }]}>
                        <Text style={styles.childAvatarText}>{child.name[0].toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.childName, { color: colors.foreground }]}>{child.name}</Text>
                      {picked
                        ? <Ionicons name="checkmark-circle" size={22} color={colors.info} />
                        : <Ionicons name="ellipse-outline" size={22} color={colors.mutedForeground} />
                      }
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {assignmentType === 'individual' && children.length === 0 && (
              <View style={[styles.noChildrenNote, { backgroundColor: colors.muted }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.noChildrenText, { color: colors.mutedForeground }]}>
                  Nenhum filho cadastrado ainda.
                </Text>
              </View>
            )}

            {assignmentType === 'first' && (
              <View style={[styles.firstNote, { backgroundColor: colors.rewardBackground, borderColor: colors.warning }]}>
                <Ionicons name="flash" size={16} color={colors.warning} />
                <Text style={[styles.firstNoteText, { color: colors.warning }]}>
                  O primeiro filho a ter a tarefa aprovada ganha a recompensa. A tarefa some para os outros.
                </Text>
              </View>
            )}
          </ScrollView>
      </AppSheet>
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
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: layout.radius.card,
    marginHorizontal: 16, marginVertical: 5, borderWidth: 1,
    ...cardShadow,
  },
  taskIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  taskInfo: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  taskFreq: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  assignBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  assignBadgeText: { fontSize: 11, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rewardText: { fontSize: 12, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  taskActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  modalContent: { padding: 20, gap: 8, paddingBottom: 60 },
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
  assignOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1.5, gap: 12,
  },
  assignOptionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  assignOptionText: { flex: 1 },
  assignOptionLabel: { fontSize: 15, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  assignOptionDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  childPickerLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 4 },
  childRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14,
    borderWidth: 1.5, gap: 12,
  },
  childAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' as const, fontFamily: 'Inter_700Bold' },
  childName: { flex: 1, fontSize: 15, fontWeight: '600' as const, fontFamily: 'Inter_600SemiBold' },
  noChildrenNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, marginTop: 4,
  },
  noChildrenText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  firstNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
  firstNoteText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 18 },
});
