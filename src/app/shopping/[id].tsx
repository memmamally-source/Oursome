import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Animated, Pressable, ScrollView, TextInput, View } from 'react-native';

import { confirmAction } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { useFoldAway } from '@/components/ui/useFoldAway';

import { Button, Card, Checkbox, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { groupItems, shoppingCategoryMeta } from '@/features/shopping/logic';
import { useShopping } from '@/features/shopping/store';
import { memberById, ME_ID, useSpace } from '@/features/space/store';
import type { ShoppingItem } from '@/features/types';
import { haptic } from '@/lib/haptics';
import { elevation, fonts, radius, space, useTheme } from '@/theme';

export default function ShoppingListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const list = useShopping((s) => s.lists.find((l) => l.id === id));
  const allItems = useShopping((s) => s.items);
  const favourites = useShopping((s) => s.favourites);
  const { addItem, togglePurchased, removeItem, clearPurchased, toggleFavourite, removeList, updateList } = useShopping.getState();
  const hasSpace = useSpace((s) => !!s.space);
  const [draft, setDraft] = useState('');

  if (!list) {
    return (
      <Screen>
        <EmptyState
          illustration="basket"
          title="List not found"
          body="It may have been deleted."
          action="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const tone = palette.accents[list.color];
  const items = allItems.filter((i) => i.listId === list.id);
  const open = items.filter((i) => !i.purchased);
  const bought = items.filter((i) => i.purchased);
  const suggestions = favourites.filter((f) => !open.some((i) => i.name.toLowerCase() === f.toLowerCase())).slice(0, 8);

  const add = (value = draft) => {
    if (!value.trim()) return;
    addItem(list.id, value, ME_ID);
    haptic.tap();
    setDraft('');
  };

  const removeWithUndo = (item: ShoppingItem) => {
    removeItem(item.id);
    toast({ message: `Removed ${item.name}`, action: { label: 'Undo', onPress: () => useShopping.getState().restoreItems([item]) } });
  };

  const confirmDelete = () => {
    const run = () => {
      removeList(list.id);
      router.back();
    };
    confirmAction({
      title: 'Delete this list?',
      message: `“${list.name}” and all its items will be removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    }).then((ok) => ok && run());
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {hasSpace ? (
            <IconButton
              icon={list.visibility === 'shared' ? 'people' : 'lock-closed'}
              label={list.visibility === 'shared' ? 'Shared. Make private' : 'Private. Share with Our Space'}
              variant="soft"
              accent="sunshine"
              onPress={() => updateList(list.id, { visibility: list.visibility === 'shared' ? 'private' : 'shared' })}
            />
          ) : null}
          <IconButton icon="trash-outline" label="Delete list" onPress={confirmDelete} />
        </View>
      </View>

      <View style={{ backgroundColor: tone.soft, borderRadius: radius.xxl, padding: space.xl, gap: space.sm, marginBottom: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: tone.base, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={list.icon} size={24} color={tone.on} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={1} accessibilityRole="header">
              {list.name}
            </Text>
            <Text variant="callout" color={tone.ink}>
              {open.length} to get · {list.visibility === 'shared' ? 'Shared with Our Space' : 'Private'}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            paddingLeft: space.lg,
            paddingRight: space.sm,
            minHeight: 56,
            marginBottom: space.md,
          },
          elevation(palette, 1),
        ]}>
        <Icon name="add" size={22} color={tone.ink} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => add()}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder="Add item — “2 milk”, “bread”"
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel="Add item"
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: palette.text, paddingVertical: space.md }}
        />
        {draft ? <IconButton icon="arrow-up" label="Add item" variant="solid" accent={list.color} size={36} onPress={() => add()} /> : null}
      </View>

      {suggestions.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
          style={{ marginBottom: space.lg }}>
          {suggestions.map((f) => (
            <Pressable
              key={f}
              onPress={() => add(f)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${f}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                height: 32,
                borderRadius: radius.pill,
                backgroundColor: palette.accents.sunshine.soft,
              }}>
              <Icon name="star" size={12} color={palette.accents.sunshine.ink} />
              <Text variant="callout" tone="sunshine">
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {open.length === 0 ? (
        <Card style={{ marginBottom: space.xl }}>
          <EmptyState
            compact
            illustration="basket"
            title={bought.length ? 'All done!' : 'Nothing on the list'}
            body={bought.length ? 'Everything’s in the basket.' : 'Add the first item above.'}
          />
        </Card>
      ) : (
        groupItems(open).map((g) => {
          const meta = shoppingCategoryMeta[g.category];
          return (
            <View key={g.category} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.xs }}>
                <Icon name={meta.icon} size={15} color={palette.accents[meta.color].ink} />
                <Text variant="overline" color={palette.accents[meta.color].ink}>
                  {meta.label}
                </Text>
              </View>
              <Card padded={false} style={{ paddingHorizontal: space.md }}>
                {g.items.map((i, idx) => (
                  <ItemRow
                    key={i.id}
                    item={i}
                    first={idx === 0}
                    favourite={favourites.includes(i.name)}
                    onToggle={() => togglePurchased(i.id)}
                    onFavourite={() => toggleFavourite(i.name)}
                    onRemove={() => removeWithUndo(i)}
                  />
                ))}
              </Card>
            </View>
          );
        })
      )}

      {bought.length ? (
        <View style={{ marginTop: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs }}>
            <Text variant="overline" tone="mint">
              In the basket · {bought.length}
            </Text>
            <Button
              label="Clear"
              size="sm"
              variant="ghost"
              accent="coral"
              onPress={() => {
                const cleared = bought;
                clearPurchased(list.id);
                toast({
                  message: `Cleared ${cleared.length} from the basket`,
                  action: { label: 'Undo', onPress: () => useShopping.getState().restoreItems(cleared) },
                });
              }}
            />
          </View>
          <Card padded={false} style={{ paddingHorizontal: space.md, opacity: 0.85 }}>
            {bought.map((i, idx) => (
              <ItemRow
                key={i.id}
                item={i}
                first={idx === 0}
                favourite={favourites.includes(i.name)}
                onToggle={() => togglePurchased(i.id)}
                onFavourite={() => toggleFavourite(i.name)}
                onRemove={() => removeWithUndo(i)}
              />
            ))}
          </Card>
          <Text variant="caption" tone="tertiary" style={{ marginTop: space.sm }}>
            Tap an item to put it back on the list.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

function ItemRow({
  item,
  first,
  favourite,
  onToggle,
  onFavourite,
  onRemove,
}: {
  item: ShoppingItem;
  first: boolean;
  favourite: boolean;
  onToggle: () => void;
  onFavourite: () => void;
  onRemove: () => void;
}) {
  const { palette } = useTheme();
  const adder = useSpace((s) => memberById(s.people, item.addedBy));
  const { style: foldStyle, onLayout, run, folding } = useFoldAway();
  // Buying slides the item into the basket; putting it back is instant.
  const toggle = () => (item.purchased ? onToggle() : run(onToggle));
  return (
    <Animated.View onLayout={onLayout} style={foldStyle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: space.md,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: palette.border,
        }}>
        <Checkbox
          checked={item.purchased || folding}
          onToggle={toggle}
          label={item.purchased ? `Put ${item.name} back on the list` : `Mark ${item.name} as bought`}
        />
        <Pressable onPress={toggle} style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no">
          <Text
            variant="body"
            tone={item.purchased ? 'tertiary' : 'primary'}
            style={{ textDecorationLine: item.purchased ? 'line-through' : 'none' }}>
            {item.name}
            {item.quantity ? (
              <Text variant="callout" tone="secondary">
                {'  '}× {item.quantity}
              </Text>
            ) : null}
          </Text>
          {adder && !adder.isMe ? (
            <Text variant="caption" tone="tertiary">
              Added by {adder.name}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          onPress={onFavourite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={favourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}>
          <Icon
            name={favourite ? 'star' : 'star-outline'}
            size={18}
            color={favourite ? palette.accents.sunshine.base : palette.textTertiary}
          />
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`}>
          <Icon name="close" size={18} color={palette.textTertiary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
