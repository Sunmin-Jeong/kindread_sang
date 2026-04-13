import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Dimensions,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Search, MapPin } from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

interface CityOption {
  city: string;
  country: string;
  display: string;
}

const CITIES: CityOption[] = [
  { city: "Seoul", country: "South Korea", display: "Seoul, South Korea" },
  { city: "Busan", country: "South Korea", display: "Busan, South Korea" },
  { city: "Incheon", country: "South Korea", display: "Incheon, South Korea" },
  { city: "Daegu", country: "South Korea", display: "Daegu, South Korea" },
  { city: "Daejeon", country: "South Korea", display: "Daejeon, South Korea" },
  { city: "Gwangju", country: "South Korea", display: "Gwangju, South Korea" },
  { city: "Tokyo", country: "Japan", display: "Tokyo, Japan" },
  { city: "Osaka", country: "Japan", display: "Osaka, Japan" },
  { city: "Kyoto", country: "Japan", display: "Kyoto, Japan" },
  { city: "Yokohama", country: "Japan", display: "Yokohama, Japan" },
  { city: "Beijing", country: "China", display: "Beijing, China" },
  { city: "Shanghai", country: "China", display: "Shanghai, China" },
  { city: "Guangzhou", country: "China", display: "Guangzhou, China" },
  { city: "Shenzhen", country: "China", display: "Shenzhen, China" },
  { city: "Hong Kong", country: "China", display: "Hong Kong, China" },
  { city: "Taipei", country: "Taiwan", display: "Taipei, Taiwan" },
  { city: "Singapore", country: "Singapore", display: "Singapore" },
  { city: "Bangkok", country: "Thailand", display: "Bangkok, Thailand" },
  { city: "Ho Chi Minh City", country: "Vietnam", display: "Ho Chi Minh City, Vietnam" },
  { city: "Hanoi", country: "Vietnam", display: "Hanoi, Vietnam" },
  { city: "Jakarta", country: "Indonesia", display: "Jakarta, Indonesia" },
  { city: "Manila", country: "Philippines", display: "Manila, Philippines" },
  { city: "Kuala Lumpur", country: "Malaysia", display: "Kuala Lumpur, Malaysia" },
  { city: "New York", country: "United States", display: "New York, United States" },
  { city: "Los Angeles", country: "United States", display: "Los Angeles, United States" },
  { city: "San Francisco", country: "United States", display: "San Francisco, United States" },
  { city: "Chicago", country: "United States", display: "Chicago, United States" },
  { city: "Boston", country: "United States", display: "Boston, United States" },
  { city: "Seattle", country: "United States", display: "Seattle, United States" },
  { city: "London", country: "United Kingdom", display: "London, United Kingdom" },
  { city: "Manchester", country: "United Kingdom", display: "Manchester, United Kingdom" },
  { city: "Edinburgh", country: "United Kingdom", display: "Edinburgh, United Kingdom" },
  { city: "Paris", country: "France", display: "Paris, France" },
  { city: "Lyon", country: "France", display: "Lyon, France" },
  { city: "Berlin", country: "Germany", display: "Berlin, Germany" },
  { city: "Munich", country: "Germany", display: "Munich, Germany" },
  { city: "Hamburg", country: "Germany", display: "Hamburg, Germany" },
  { city: "Amsterdam", country: "Netherlands", display: "Amsterdam, Netherlands" },
  { city: "Madrid", country: "Spain", display: "Madrid, Spain" },
  { city: "Barcelona", country: "Spain", display: "Barcelona, Spain" },
  { city: "Rome", country: "Italy", display: "Rome, Italy" },
  { city: "Milan", country: "Italy", display: "Milan, Italy" },
  { city: "Sydney", country: "Australia", display: "Sydney, Australia" },
  { city: "Melbourne", country: "Australia", display: "Melbourne, Australia" },
  { city: "Toronto", country: "Canada", display: "Toronto, Canada" },
  { city: "Vancouver", country: "Canada", display: "Vancouver, Canada" },
  { city: "Montreal", country: "Canada", display: "Montreal, Canada" },
  { city: "Sao Paulo", country: "Brazil", display: "Sao Paulo, Brazil" },
  { city: "Rio de Janeiro", country: "Brazil", display: "Rio de Janeiro, Brazil" },
  { city: "Mexico City", country: "Mexico", display: "Mexico City, Mexico" },
  { city: "Dubai", country: "UAE", display: "Dubai, UAE" },
  { city: "Mumbai", country: "India", display: "Mumbai, India" },
  { city: "Delhi", country: "India", display: "Delhi, India" },
  { city: "Bangalore", country: "India", display: "Bangalore, India" },
];

interface CitySearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: string, country: string) => void;
  currentValue?: string;
}

export function CitySearchModal({
  visible,
  onClose,
  onSelect,
  currentValue,
}: CitySearchModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return CITIES;
    const query = searchQuery.toLowerCase();
    return CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(query) ||
        c.country.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (option: CityOption) => {
    onSelect(option.city, option.country);
    setSearchQuery("");
    onClose();
  };

  const handleCustomEntry = () => {
    if (searchQuery.trim()) {
      const parts = searchQuery.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        onSelect(parts[0], parts.slice(1).join(", "));
      } else {
        onSelect(searchQuery.trim(), "");
      }
      setSearchQuery("");
      onClose();
    }
  };

  const renderItem = ({ item }: { item: CityOption }) => {
    const isSelected = currentValue === item.display;
    return (
      <Pressable
        style={[
          styles.option,
          isSelected && { backgroundColor: theme.accent + "15" },
        ]}
        onPress={() => handleSelect(item)}
      >
        <MapPin size={16} color={isSelected ? theme.accent : theme.textSecondary} strokeWidth={1.5} />
        <View style={styles.optionText}>
          <ThemedText
            style={[
              styles.cityText,
              isSelected && { color: theme.accent, fontWeight: "600" },
            ]}
          >
            {item.city}
          </ThemedText>
          <ThemedText style={[styles.countryText, { color: theme.textSecondary }]}>
            {item.country}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.modal,
            {
              backgroundColor: "#F9F7F2",
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText style={styles.title}>Search City</ThemedText>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
              hitSlop={8}
            >
              <X size={18} color={theme.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Search size={18} color={theme.textSecondary} strokeWidth={1.5} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Type city name..."
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
          </View>

          {searchQuery.trim() && filteredCities.length === 0 ? (
            <Pressable
              style={[styles.customEntry, { borderColor: theme.accent }]}
              onPress={handleCustomEntry}
            >
              <MapPin size={16} color={theme.accent} strokeWidth={1.5} />
              <ThemedText style={[styles.customEntryText, { color: theme.accent }]}>
                Use "{searchQuery}"
              </ThemedText>
            </Pressable>
          ) : null}

          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.display}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modal: {
    height: MODAL_HEIGHT,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  optionText: {
    flex: 1,
  },
  cityText: {
    fontSize: 15,
  },
  countryText: {
    fontSize: 12,
    marginTop: 2,
  },
  customEntry: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  customEntryText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
