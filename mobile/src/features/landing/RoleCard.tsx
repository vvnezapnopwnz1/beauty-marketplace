import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BentoCard } from "../../features/more/BentoCard";
import { useTheme } from "../../shared/theme/useTheme";

export interface RoleCardData {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ComponentProps<typeof Feather>["name"];
  gradient: [string, string];
  textColor: string;
  accentColor: string;
  ctaLabel: string;
  disabled?: boolean;
  comingSoon?: boolean;
  onPress?: () => void;
}

type Props = RoleCardData;

export function RoleCard({
  title,
  description,
  features,
  icon,
  gradient,
  textColor,
  accentColor,
  ctaLabel,
  disabled,
  comingSoon,
  onPress,
}: Props) {
  const { colors } = useTheme();
  return (
    <BentoCard
      gradient={gradient}
      onPress={disabled ? undefined : onPress}
      style={{ marginBottom: 12 }}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
          <Feather name={icon} size={18} color={colors.textInverse} />
        </View>
        {comingSoon && (
          <View style={[styles.badge, { backgroundColor: colors.borderLight }]}>
            <Text style={[styles.badgeText, { color: colors.muted }]}>
              Скоро
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.description, { color: textColor }]}>
        {description}
      </Text>

      {features.length > 0 && (
        <View style={styles.featureList}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.bullet, { backgroundColor: accentColor }]} />
              <Text style={[styles.featureText, { color: textColor }]}>
                {f}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!disabled && onPress && (
        <View style={[styles.cta, { backgroundColor: accentColor }]}>
          <Text style={[styles.ctaText, { color: colors.textInverse }]}>
            {ctaLabel}
          </Text>
        </View>
      )}
      {disabled && (
        <View style={[styles.cta, { backgroundColor: colors.borderLight }]}>
          <Text style={[styles.ctaText, { color: colors.muted }]}>
            {ctaLabel}
          </Text>
        </View>
      )}
    </BentoCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 10,
  },
  featureList: {
    gap: 6,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  featureText: {
    fontSize: 12,
    opacity: 0.75,
  },
  cta: {
    marginTop: "auto",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
