import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

/** Scrollable page with a centered max-width column and an optional pinned footer. */
export function Screen({
  header,
  children,
  footer,
  inTab = false,
}: {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Tab screens: the tab bar already handles the bottom safe area. */
  inTab?: boolean;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={inTab ? ['top'] : ['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header ? <Column style={{ paddingTop: Spacing.md }}>{header}</Column> : null}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: Spacing.xl }}
          keyboardShouldPersistTaps="handled">
          <Column>{children}</Column>
        </ScrollView>
        {footer ? (
          <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.md }}>
            <Column>{footer}</Column>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Column({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View
      style={[
        { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
        style,
      ]}>
      {children}
    </View>
  );
}
