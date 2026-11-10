import { Pressable, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import type { ProfileDraft } from '@/features/profile/schema';

import { summarize } from './summary';

export function SummaryList({ draft, onEdit }: { draft: ProfileDraft; onEdit?: (stepId: string) => void }) {
  return (
    <View style={{ gap: Spacing.md }}>
      {summarize(draft).map((section) => (
        <Card key={section.stepId} style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="label">{section.title}</AppText>
            {onEdit ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${section.title}`}
                onPress={() => onEdit(section.stepId)}
                hitSlop={12}>
                <AppText variant="small" tone="accent" style={{ fontWeight: '600' }}>
                  Edit
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {section.rows.map((row) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                gap: Spacing.md,
                borderTopWidth: 1,
                borderTopColor: Colors.border,
                paddingTop: Spacing.sm,
              }}>
              <AppText variant="small" tone="secondary" style={{ width: 110 }}>
                {row.label}
              </AppText>
              <AppText variant="small" style={{ flex: 1 }}>
                {row.value}
              </AppText>
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}
