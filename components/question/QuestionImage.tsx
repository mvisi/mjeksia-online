import { Icon } from "@/components/ui/Icon";
import { imageMap } from "@/constants/imageMap";
import { getSetting } from "@/services/settings/settings";
import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, StatusBar, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function QuestionImage({ imageKey }: { imageKey: string | null }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const source = imageKey ? imageMap[imageKey as keyof typeof imageMap] : undefined;

  if (!source) {
    if (!getSetting("always_show_image_placeholder")) return null;
    return (
      <View className="h-40 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40">
        <Icon name="image-outline" size={36} token="--muted-foreground" />
        <Text className="mt-2 text-muted-foreground">Nuk ka imazh</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Imazhi i pyetjes. Prek për ta zmadhuar."
        onPress={() => setOpen(true)}
        className="h-56 overflow-hidden rounded-xl border border-border bg-white active:opacity-90"
      >
        {/* Diagrams are drawn on white, so keep a white backdrop in dark mode too. */}
        <Image source={source} style={{ flex: 1 }} contentFit="contain" transition={150} />
        <View className="absolute bottom-2 right-2 rounded-lg bg-black/60 p-1.5">
          <Icon name="expand" size={16} token="--primary-foreground" />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" />
        <View className="flex-1 bg-black/95">
          <Image source={source} style={{ flex: 1, margin: 12 }} contentFit="contain" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mbyll imazhin"
            onPress={() => setOpen(false)}
            style={{ top: insets.top + 8 }}
            className="absolute right-4 h-11 w-11 items-center justify-center rounded-full bg-white/15 active:bg-white/30"
          >
            <Text className="text-2xl text-white">✕</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
