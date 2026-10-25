import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';

import { ChipRow, Field } from '@/components/forms/Fields';
import { Button, Card, Chip, ModalHeader, ModalScreen, Text, TextField } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { parseICS, toICS, type ImportedEvent } from '@/features/calendar/ics';
import { useCalendar } from '@/features/calendar/store';
import { useSpace } from '@/features/space/store';
import { format, fromLocalDateTime } from '@/lib/dates';
import { pickTextFile, saveTextFile } from '@/lib/files';
import { fonts, radius, space, useTheme } from '@/theme';

/**
 * Calendar files (.ics): bring events in from Google, Apple or Outlook, or
 * take Oursome's events out to them. A one-time copy each way, not live sync.
 */
export default function CalendarFilesScreen() {
  const { palette } = useTheme();
  const calendars = useCalendar((s) => s.calendars);
  const events = useCalendar((s) => s.events);
  const household = useSpace((s) => s.space);
  const own = calendars.filter((c) => c.kind !== 'imported');
  const [chosen, setChosen] = useState<string[]>(() => own.map((c) => c.id));
  const [preview, setPreview] = useState<ImportedEvent[] | null>(null);
  const [name, setName] = useState('');
  const [pasted, setPasted] = useState('');

  const exportable = events.filter((e) => chosen.includes(e.calendarId) && !e.taskId);

  const download = async () => {
    const title = household?.name ?? 'Oursome';
    await saveTextFile(`${title.replace(/[^\w -]/g, '').trim() || 'oursome'}-calendar.ics`, toICS(exportable, title), 'text/calendar');
    toast({ message: `${exportable.length} ${exportable.length === 1 ? 'event' : 'events'} saved to a calendar file` });
  };

  const read = (text: string, fileName?: string) => {
    const found = parseICS(text);
    if (!found.length) {
      toast({ message: 'No events found in that file. Is it a calendar (.ics) file?', tone: 'error' });
      return;
    }
    setPreview(found);
    setName(fileName ? fileName.replace(/\.ics$/i, '') : 'Imported');
  };

  const choose = async () => {
    const file = await pickTextFile('.ics,text/calendar');
    if (file) read(file.text, file.name);
  };

  const confirmImport = () => {
    if (!preview) return;
    const { added, updated } = useCalendar.getState().importEvents(preview, name);
    const parts = [added ? `${added} added` : '', updated ? `${updated} updated` : ''].filter(Boolean).join(', ');
    toast({ message: parts ? `Events imported: ${parts}` : 'Nothing new to import' });
    router.back();
  };

  const simplified = preview?.filter((e) => e.simplified).length ?? 0;

  return (
    <ModalScreen header={<ModalHeader title="Calendar files" />}>
      <View
        style={{
          backgroundColor: palette.accents.sky.soft,
          borderRadius: radius.lg,
          padding: space.md,
          flexDirection: 'row',
          gap: space.sm,
        }}>
        <Icon name="information-circle-outline" size={18} color={palette.accents.sky.ink} />
        <Text variant="caption" tone="sky" style={{ flex: 1 }}>
          Calendar files copy events once, in either direction. Later changes in Google or Apple Calendar don’t appear here by themselves:
          import the file again to update. Live two-way sync isn’t available yet.
        </Text>
      </View>

      {preview ? (
        <Card style={{ gap: space.md }}>
          <Text variant="heading">
            {preview.length} {preview.length === 1 ? 'event' : 'events'} found
          </Text>
          <View style={{ gap: space.xs }}>
            {preview.slice(0, 8).map((e, i) => (
              <Text key={i} variant="callout" numberOfLines={1}>
                <Text variant="callout" tone="secondary">
                  {format(fromLocalDateTime(e.start), e.allDay ? 'd MMM yyyy' : 'd MMM yyyy, HH:mm')}
                  {'  '}
                </Text>
                {e.title}
                {e.recurrence ? ' ↻' : ''}
              </Text>
            ))}
            {preview.length > 8 ? (
              <Text variant="caption" tone="secondary">
                and {preview.length - 8} more
              </Text>
            ) : null}
          </View>
          {simplified ? (
            <Text variant="caption" tone="sunshine">
              {simplified} repeating {simplified === 1 ? 'event uses a pattern' : 'events use patterns'} Oursome can’t show exactly (like
              “Mondays and Wednesdays”). They’ll repeat on the first day only; check them after importing.
            </Text>
          ) : null}
          <TextField label="Add to a calendar called" value={name} onChangeText={setName} maxLength={40} />
          <Text variant="caption" tone="tertiary">
            Imported events are private to you. Importing into the same calendar again updates events instead of duplicating them.
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button label={`Import ${preview.length}`} icon="download-outline" onPress={confirmImport} disabled={!name.trim()} />
            <Button label="Cancel" variant="ghost" onPress={() => setPreview(null)} />
          </View>
        </Card>
      ) : (
        <Field icon="download-outline" label="Import a calendar file" accent="sky">
          {Platform.OS === 'web' ? (
            <Button
              label="Choose an .ics file"
              icon="document-outline"
              variant="secondary"
              onPress={choose}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            multiline
            placeholder={Platform.OS === 'web' ? 'Or paste the file’s contents here' : 'Paste the calendar file’s contents here'}
            placeholderTextColor={palette.textTertiary}
            accessibilityLabel="Calendar file contents"
            style={{
              minHeight: 90,
              backgroundColor: palette.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: palette.border,
              padding: space.md,
              fontFamily: fonts.body,
              fontSize: 14,
              color: palette.text,
              textAlignVertical: 'top',
            }}
          />
          {pasted.trim() ? (
            <Button label="Read events" variant="soft" accent="sky" onPress={() => read(pasted)} style={{ alignSelf: 'flex-start' }} />
          ) : null}
          <Text variant="caption" tone="tertiary">
            Google Calendar: Settings → Import & export → Export. Apple Calendar: File → Export.
          </Text>
        </Field>
      )}

      <Field icon="share-outline" label="Export to Google, Apple or Outlook" accent="coral">
        <ChipRow>
          {own.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              small
              dot={c.color}
              accent={c.color}
              selected={chosen.includes(c.id)}
              onPress={() => setChosen((x) => (x.includes(c.id) ? x.filter((id) => id !== c.id) : [...x, c.id]))}
            />
          ))}
        </ChipRow>
        <Button
          label={`Save ${exportable.length} ${exportable.length === 1 ? 'event' : 'events'} as .ics`}
          icon="download-outline"
          variant="secondary"
          onPress={download}
          disabled={!exportable.length}
          style={{ alignSelf: 'flex-start' }}
        />
        <Text variant="caption" tone="tertiary">
          Then in Google Calendar: Settings → Import & export → Import. In Apple Calendar: File → Import.
        </Text>
      </Field>
    </ModalScreen>
  );
}
