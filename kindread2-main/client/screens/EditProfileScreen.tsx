import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { ChevronDown, MapPin } from "lucide-react-native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { BottomHalfModalPicker } from "@/components/BottomHalfModalPicker";
import { CitySearchModal } from "@/components/CitySearchModal";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Indonesian', label: 'Indonesian' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Polish', label: 'Polish' },
];

const currentYear = new Date().getFullYear();
const BIRTH_YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => {
  const year = currentYear - 10 - i;
  return { value: String(year), label: String(year) };
});

type GenderType = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { profile, updateProfile, refreshProfile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [birthYear, setBirthYear] = useState<number | undefined>();
  const [gender, setGender] = useState<GenderType | undefined>();
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showBirthYearPicker, setShowBirthYearPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio || "");
      setBirthYear(profile.birthYear);
      setGender(profile.gender);
      setCity(profile.city || "");
      setCountry(profile.country || "");
      setLanguages(profile.languages || []);
    }
  }, [profile]);

  const locationDisplay = [city, country].filter(Boolean).join(", ") || "";

  const handleCitySelect = (selectedCity: string, selectedCountry: string) => {
    setCity(selectedCity);
    setCountry(selectedCountry);
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("Missing Username", "Please enter a username.");
      return;
    }

    setIsSaving(true);

    try {
      const uniqueLanguages = [...new Set(languages)];
      
      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        birthYear,
        gender,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        languages: uniqueLanguages,
      });

      await refreshProfile();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) => {
      if (prev.includes(lang)) {
        return prev.filter((l) => l !== lang);
      }
      return [...new Set([...prev, lang])];
    });
  };

  const getGenderLabel = () => {
    const option = GENDER_OPTIONS.find((o) => o.value === gender);
    return option ? option.label : "Select gender";
  };

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            NAME
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            BIO
          </ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="A few words about yourself..."
            placeholderTextColor={theme.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              BIRTH YEAR
            </ThemedText>
            <Pressable
              style={[
                styles.picker,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setShowBirthYearPicker(true)}
            >
              <ThemedText
                style={[
                  styles.pickerText,
                  !birthYear && { color: theme.textSecondary },
                ]}
              >
                {birthYear || "Select year"}
              </ThemedText>
              <ChevronDown size={18} color={theme.textSecondary} strokeWidth={1.5} />
            </Pressable>
          </View>

          <View style={[styles.field, styles.halfField]}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              GENDER
            </ThemedText>
            <Pressable
              style={[
                styles.picker,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setShowGenderPicker(true)}
            >
              <ThemedText
                style={[
                  styles.pickerText,
                  !gender && { color: theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {getGenderLabel()}
              </ThemedText>
              <ChevronDown size={18} color={theme.textSecondary} strokeWidth={1.5} />
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            LOCATION
          </ThemedText>
          <Pressable
            style={[
              styles.locationPicker,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setShowCityPicker(true)}
          >
            <MapPin size={18} color={theme.textSecondary} strokeWidth={1.5} />
            <ThemedText
              style={[
                styles.locationPickerText,
                !locationDisplay && { color: theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {locationDisplay || "Search city..."}
            </ThemedText>
            <ChevronDown size={18} color={theme.textSecondary} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            LANGUAGES
          </ThemedText>
          <Pressable
            style={[
              styles.picker,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setShowLanguagePicker(true)}
          >
            <ThemedText
              style={[
                styles.pickerText,
                languages.length === 0 && { color: theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {languages.length > 0 ? languages.join(", ") : "Select languages"}
            </ThemedText>
            <ChevronDown size={18} color={theme.textSecondary} strokeWidth={1.5} />
          </Pressable>
        </View>

        <Button
          onPress={handleSave}
          disabled={isSaving || !username.trim()}
          style={styles.saveButton}
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      </KeyboardAwareScrollViewCompat>

      <BottomHalfModalPicker
        visible={showBirthYearPicker}
        onClose={() => setShowBirthYearPicker(false)}
        title="Birth Year"
        options={BIRTH_YEAR_OPTIONS}
        selectedValue={birthYear ? String(birthYear) : undefined}
        onSelect={(value) => setBirthYear(Number(value))}
      />

      <BottomHalfModalPicker
        visible={showGenderPicker}
        onClose={() => setShowGenderPicker(false)}
        title="Gender"
        options={GENDER_OPTIONS}
        selectedValue={gender}
        onSelect={(value) => setGender(value as GenderType)}
      />

      <BottomHalfModalPicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        title="Languages"
        options={LANGUAGE_OPTIONS}
        selectedValues={languages}
        onSelect={toggleLanguage}
        multiSelect
      />

      <CitySearchModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onSelect={handleCitySelect}
        currentValue={locationDisplay}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  halfField: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    fontSize: 15,
  },
  picker: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 15,
    flex: 1,
  },
  locationPicker: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  locationPickerText: {
    flex: 1,
    fontSize: 15,
  },
  saveButton: {
    marginTop: Spacing.xl,
  },
});
