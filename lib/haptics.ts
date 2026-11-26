import { getSetting } from "@/services/settings/settings";
import * as Haptics from "expo-haptics";

const enabled = () => getSetting("haptics");

export const haptics = {
  select() {
    if (enabled()) void Haptics.selectionAsync();
  },
  impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
    if (enabled()) void Haptics.impactAsync(style);
  },
  success() {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error() {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  warning() {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
