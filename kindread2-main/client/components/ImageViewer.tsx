import React, { useState, useRef } from "react";
import { View, StyleSheet, Modal, Pressable, Dimensions, Platform, FlatList } from "react-native";
import { Image } from "expo-image";
import { X, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewer({ visible, images, initialIndex = 0, onClose }: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  React.useEffect(() => {
    if (visible && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      setCurrentIndex(newIndex);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      setCurrentIndex(newIndex);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  if (images.length === 0) return null;

  const renderImage = ({ item }: { item: string }) => (
    <View style={styles.imageWrapper}>
      <Image
        source={{ uri: item }}
        style={styles.fullImage}
        contentFit="contain"
        transition={200}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImage}
          keyExtractor={(item, index) => `${index}-${item}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialScrollIndex={initialIndex}
          style={styles.flatList}
        />

        <Pressable
          onPress={handleClose}
          style={[styles.closeButton, { top: insets.top + Spacing.md }]}
          hitSlop={12}
        >
          <View style={styles.closeButtonInner}>
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </View>
        </Pressable>

        {images.length > 1 ? (
          <>
            {currentIndex > 0 ? (
              <Pressable onPress={goToPrevious} style={[styles.navButton, styles.navLeft]} hitSlop={12}>
                <View style={styles.navButtonInner}>
                  <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2} />
                </View>
              </Pressable>
            ) : null}
            {currentIndex < images.length - 1 ? (
              <Pressable onPress={goToNext} style={[styles.navButton, styles.navRight]} hitSlop={12}>
                <View style={styles.navButtonInner}>
                  <ChevronRight size={28} color="#FFFFFF" strokeWidth={2} />
                </View>
              </Pressable>
            ) : null}

            <View style={[styles.pagination, { bottom: insets.bottom + Spacing.xl }]}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentIndex ? styles.paginationDotActive : null,
                  ]}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  flatList: {
    flex: 1,
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH - Spacing.lg * 2,
    height: SCREEN_HEIGHT * 0.75,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
  },
  navLeft: {
    left: Spacing.md,
  },
  navRight: {
    right: Spacing.md,
  },
  navButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  pagination: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  paginationDotActive: {
    backgroundColor: "#FFFFFF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
