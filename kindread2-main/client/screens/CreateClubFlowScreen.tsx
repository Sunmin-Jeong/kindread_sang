import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ChevronLeft,
  Check,
  X,
  BookOpen,
  Users,
  MapPin,
  Monitor,
  BookMarked,
  Camera,
  CalendarDays,
  Link2,
  AlignLeft,
  Pencil,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { createSession, createClub } from "@/lib/club-storage";
import { searchBooks } from "@/lib/books-api";
import { supabase } from "@/lib/supabase";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { BookSearchResult, ClubFormat } from "@/types";

const GREEN = "#2A7A52";
const GREEN_BG = "#E8F3ED";
const PURPLE = "#7C3AED";
const PURPLE_BG = "#F3F0FF";
const BORDER = "#EBEBEB";
const MUTED = "#777777";
const TEXT = "#0A0A0A";

type ClubTypeChoice = "session" | "club";
type SessionStep = "type" | "form";

interface FormatOption {
  key: ClubFormat;
  label: string;
  sub: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { key: "offline", label: "Offline", sub: "Meet in person", Icon: MapPin },
  { key: "online", label: "Online", sub: "Video call", Icon: Monitor },
  { key: "read_along", label: "Read-along", sub: "Read together", Icon: BookMarked },
];

export default function CreateClubFlowScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sessionStep, setSessionStep] = useState<SessionStep>("type");
  const [typeChoice, setTypeChoice] = useState<ClubTypeChoice | null>(null);

  // Session fields
  const [format, setFormat] = useState<ClubFormat>("online");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [deadline, setDeadline] = useState("");

  // Club fields
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [clubFormat, setClubFormat] = useState<ClubFormat>("online");
  const [clubLocation, setClubLocation] = useState("");
  const [joinPolicy, setJoinPolicy] = useState<"auto" | "approval">("auto");
  const [clubImageUrl, setClubImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBookSearch = (q: string) => {
    setBookQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setBookResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchingBooks(true);
      try {
        const results = await searchBooks(q);
        setBookResults(results);
      } catch { /* ignore */ } finally {
        setSearchingBooks(false);
      }
    }, 400);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission required", "Allow photo access to upload a cover."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    setUploadingImage(true);
    try {
      const { File } = await import("expo-file-system");
      const file = new File(uri);
      const ext = uri.split(".").pop() || "jpg";
      const fileName = `club-cover-${Date.now()}.${ext}`;
      await supabase.storage.from("club-covers").upload(fileName, file as any, { contentType: `image/${ext}` });
      const { data: { publicUrl } } = supabase.storage.from("club-covers").getPublicUrl(fileName);
      setClubImageUrl(publicUrl);
    } catch (e) {
      console.error("Image upload error:", e);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEnsureBook = async (book: BookSearchResult) => {
    try {
      await supabase.from("books").upsert({
        id: book.id,
        title: book.title,
        author: book.author,
        cover_url: book.coverUrl,
        isbn: book.isbn || null,
        total_pages: book.pageCount || null,
      }, { onConflict: "id" });
    } catch { /* ignore */ }
  };

  const handleCreateSession = async () => {
    if (!selectedBook || !user?.id) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      await handleEnsureBook(selectedBook);
      const result = await createSession({
        name: sessionName || selectedBook.title,
        format,
        bookId: selectedBook.id,
        meetDate: meetDate || undefined,
        location: format === "offline" ? location : undefined,
        link: format === "online" ? link : undefined,
        deadline: format === "read_along" ? deadline : undefined,
      }, user.id);
      if (result.success && result.clubId) {
        navigation.replace("SessionDetail", { clubId: result.clubId });
      } else {
        Alert.alert("Error", result.error || "Failed to create session");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClub = async () => {
    if (!clubName.trim() || !user?.id) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    try {
      const result = await createClub({
        name: clubName.trim(),
        description: clubDesc.trim(),
        imageUrl: clubImageUrl || undefined,
        meetingMode: clubFormat === "offline" ? "offline" : "online",
        format: clubFormat,
        joinPolicy,
        city: clubFormat === "offline" ? clubLocation : undefined,
      } as any, user.id);
      if (result.success && result.clubId) {
        navigation.replace("ClubHome", { clubId: result.clubId });
      } else {
        Alert.alert("Error", result.error || "Failed to create club");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (sessionStep === "form") {
      setSessionStep("type");
    } else {
      navigation.goBack();
    }
  };

  // ─── Type selection ──────────────────────────────────────────────────────
  const renderTypeSelect = () => (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={[styles.stepTitle, { color: theme.text }]} serif>
        What kind of club?
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: MUTED }]}>
        Choose how you want to read together.
      </ThemedText>

      {/* Session card */}
      <Pressable
        style={[styles.typeCard, { borderColor: typeChoice === "session" ? PURPLE : BORDER }]}
        onPress={() => {
          setTypeChoice("session");
          setSessionStep("form");
        }}
      >
        <View style={[styles.typeIconWrap, { backgroundColor: PURPLE_BG }]}>
          <BookOpen size={22} color={PURPLE} strokeWidth={1.75} />
        </View>
        <View style={styles.typeCardBody}>
          <View style={styles.typeNameRow}>
            <ThemedText style={[styles.typeName, { color: theme.text }]}>Session</ThemedText>
            <View style={[styles.typePill, { backgroundColor: PURPLE_BG }]}>
              <ThemedText style={[styles.typePillText, { color: PURPLE }]}>One-time</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.typeDesc, { color: MUTED }]}>
            Built around a single book. Meet once, then it's done.
          </ThemedText>
          <ThemedText style={[styles.typeExamples, { color: MUTED }]}>
            Offline meetup · Online discussion · Read-along
          </ThemedText>
        </View>
      </Pressable>

      {/* Club card */}
      <Pressable
        style={[styles.typeCard, { borderColor: typeChoice === "club" ? GREEN : BORDER, marginTop: 12 }]}
        onPress={() => {
          setTypeChoice("club");
          setSessionStep("form");
        }}
      >
        <View style={[styles.typeIconWrap, { backgroundColor: GREEN_BG }]}>
          <Users size={22} color={GREEN} strokeWidth={1.75} />
        </View>
        <View style={styles.typeCardBody}>
          <View style={styles.typeNameRow}>
            <ThemedText style={[styles.typeName, { color: theme.text }]}>Club</ThemedText>
            <View style={[styles.typePill, { backgroundColor: GREEN_BG }]}>
              <ThemedText style={[styles.typePillText, { color: GREEN }]}>Ongoing</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.typeDesc, { color: MUTED }]}>
            A recurring group. Pick new books each session, or explore movies, essays, anything.
          </ThemedText>
          <ThemedText style={[styles.typeExamples, { color: MUTED }]}>
            Book club · Film club · Writing group
          </ThemedText>
        </View>
      </Pressable>
    </ScrollView>
  );

  // ─── Session single-scroll form ──────────────────────────────────────────
  const renderSessionForm = () => (
    <ScrollView
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* BOOK */}
      <View style={styles.sectionHeader}>
        <BookOpen size={15} color={PURPLE} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: PURPLE }]}>Book</ThemedText>
        <ThemedText style={[styles.required, { color: "#CC4444" }]}>required</ThemedText>
      </View>

      <View style={[styles.searchInputWrap, { borderColor: BORDER }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by title or author..."
          placeholderTextColor={MUTED}
          value={bookQuery}
          onChangeText={handleBookSearch}
        />
        {searchingBooks ? (
          <ActivityIndicator size="small" color={PURPLE} style={{ marginRight: 10 }} />
        ) : null}
      </View>

      {selectedBook ? (
        <View style={[styles.selectedBookRow, { borderColor: PURPLE, backgroundColor: PURPLE_BG }]}>
          {selectedBook.coverUrl ? (
            <Image source={{ uri: selectedBook.coverUrl }} style={styles.selectedBookCover} contentFit="cover" />
          ) : null}
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.selectedBookTitle, { color: TEXT }]} numberOfLines={1}>
              {selectedBook.title}
            </ThemedText>
            <ThemedText style={[styles.selectedBookAuthor, { color: MUTED }]} numberOfLines={1}>
              {selectedBook.author}
            </ThemedText>
          </View>
          <Pressable onPress={() => { setSelectedBook(null); setBookQuery(""); }} hitSlop={8}>
            <X size={16} color={MUTED} />
          </Pressable>
        </View>
      ) : null}

      {bookResults.length > 0 ? (
        <View style={[styles.bookResultsBox, { borderColor: BORDER }]}>
          {bookResults.slice(0, 6).map((item) => (
            <Pressable
              key={item.id}
              style={[styles.bookResultRow, { borderBottomColor: BORDER }]}
              onPress={() => {
                setSelectedBook(item);
                setBookResults([]);
                setBookQuery(item.title);
              }}
            >
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.bookResultCover} contentFit="cover" />
              ) : (
                <View style={[styles.bookResultCoverPlaceholder, { backgroundColor: "#F0F0F0" }]} />
              )}
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.bookResultTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </ThemedText>
                <ThemedText style={[styles.bookResultAuthor, { color: MUTED }]} numberOfLines={1}>
                  {item.author}
                </ThemedText>
              </View>
              {selectedBook?.id === item.id ? <Check size={16} color={PURPLE} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* FORMAT */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <MapPin size={15} color={PURPLE} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: PURPLE }]}>Format</ThemedText>
      </View>
      <View style={styles.formatGrid}>
        {FORMAT_OPTIONS.map((f) => {
          const active = format === f.key;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.formatCard,
                { borderColor: active ? PURPLE : BORDER, backgroundColor: active ? PURPLE_BG : "#FAFAFA" },
              ]}
              onPress={() => setFormat(f.key)}
            >
              <f.Icon size={20} color={active ? PURPLE : MUTED} strokeWidth={1.75} />
              <ThemedText style={[styles.formatLabel, { color: active ? PURPLE : theme.text }]}>
                {f.label}
              </ThemedText>
              <ThemedText style={[styles.formatSub, { color: MUTED }]}>{f.sub}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* DATE */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <CalendarDays size={15} color={MUTED} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Date & time</ThemedText>
        <ThemedText style={[styles.optionalTag, { color: MUTED }]}>optional</ThemedText>
      </View>
      <TextInput
        style={[styles.textInput, { borderColor: BORDER, color: theme.text }]}
        placeholder="e.g. 2026-04-10 14:00"
        placeholderTextColor={MUTED}
        value={meetDate}
        onChangeText={setMeetDate}
      />

      {/* LOCATION / LINK / DEADLINE */}
      {format === "offline" ? (
        <>
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <MapPin size={15} color={MUTED} strokeWidth={2} />
            <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Location</ThemedText>
            <ThemedText style={[styles.optionalTag, { color: MUTED }]}>optional</ThemedText>
          </View>
          <TextInput
            style={[styles.textInput, { borderColor: BORDER, color: theme.text }]}
            placeholder="e.g. Blue Bottle Coffee, Seoul"
            placeholderTextColor={MUTED}
            value={location}
            onChangeText={setLocation}
          />
        </>
      ) : null}

      {format === "online" ? (
        <>
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Link2 size={15} color={MUTED} strokeWidth={2} />
            <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Video link</ThemedText>
            <ThemedText style={[styles.optionalTag, { color: MUTED }]}>optional</ThemedText>
          </View>
          <TextInput
            style={[styles.textInput, { borderColor: BORDER, color: theme.text }]}
            placeholder="https://meet.google.com/..."
            placeholderTextColor={MUTED}
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            keyboardType="url"
          />
        </>
      ) : null}

      {format === "read_along" ? (
        <>
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <CalendarDays size={15} color={MUTED} strokeWidth={2} />
            <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Reading deadline</ThemedText>
            <ThemedText style={[styles.optionalTag, { color: MUTED }]}>optional</ThemedText>
          </View>
          <TextInput
            style={[styles.textInput, { borderColor: BORDER, color: theme.text }]}
            placeholder="e.g. 2026-04-01"
            placeholderTextColor={MUTED}
            value={deadline}
            onChangeText={setDeadline}
          />
        </>
      ) : null}

      {/* SESSION NAME */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Pencil size={15} color={MUTED} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Session name</ThemedText>
        <ThemedText style={[styles.optionalTag, { color: MUTED }]}>optional</ThemedText>
      </View>
      <TextInput
        style={[styles.textInput, { borderColor: BORDER, color: theme.text }]}
        placeholder={selectedBook ? `e.g. ${selectedBook.title} read-along` : "Give your session a name"}
        placeholderTextColor={MUTED}
        value={sessionName}
        onChangeText={setSessionName}
      />

      {/* CREATE BUTTON */}
      <Pressable
        style={[
          styles.createBtn,
          { backgroundColor: selectedBook ? PURPLE : BORDER, marginTop: 32 },
        ]}
        onPress={handleCreateSession}
        disabled={!selectedBook || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={[styles.createBtnText, { color: selectedBook ? "#FFFFFF" : MUTED }]}>
            Create Session
          </ThemedText>
        )}
      </Pressable>

      {!selectedBook ? (
        <ThemedText style={[styles.hintText, { color: MUTED }]}>
          Select a book to create the session
        </ThemedText>
      ) : null}

      <View style={{ height: 48 }} />
    </ScrollView>
  );

  // ─── Club form ───────────────────────────────────────────────────────────
  const renderClubForm = () => (
    <ScrollView
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText style={[styles.stepTitle, { color: theme.text }]} serif>New club</ThemedText>

      {/* Cover image */}
      <Pressable style={[styles.imagePicker, { borderColor: BORDER }]} onPress={handlePickImage}>
        {uploadingImage ? (
          <ActivityIndicator color={GREEN} />
        ) : clubImageUrl ? (
          <Image source={{ uri: clubImageUrl }} style={styles.imagePickerFill} contentFit="cover" />
        ) : (
          <View style={styles.imagePickerInner}>
            <Camera size={20} color={MUTED} strokeWidth={1.75} />
            <ThemedText style={[styles.imagePickerText, { color: MUTED }]}>Add cover photo</ThemedText>
          </View>
        )}
      </Pressable>

      {/* Name */}
      <View style={styles.sectionHeader}>
        <Pencil size={15} color={GREEN} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: GREEN }]}>Club name</ThemedText>
        <ThemedText style={[styles.required, { color: "#CC4444" }]}>required</ThemedText>
      </View>
      <TextInput
        style={[styles.textInput, { borderColor: clubName.trim() ? BORDER : "#FFCCCC", color: theme.text }]}
        placeholder="e.g. Seoul Readers"
        placeholderTextColor={MUTED}
        value={clubName}
        onChangeText={setClubName}
      />

      {/* Description */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <AlignLeft size={15} color={MUTED} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Description</ThemedText>
        <ThemedText style={[styles.optionalTag, { color: MUTED }]}>optional</ThemedText>
      </View>
      <TextInput
        style={[styles.textInput, styles.textArea, { borderColor: BORDER, color: theme.text }]}
        placeholder="What is this club about?"
        placeholderTextColor={MUTED}
        value={clubDesc}
        onChangeText={setClubDesc}
        multiline
        numberOfLines={3}
      />

      {/* Format */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <MapPin size={15} color={MUTED} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Format</ThemedText>
      </View>
      <View style={styles.pillRow}>
        {FORMAT_OPTIONS.map((f) => {
          const active = clubFormat === f.key;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.formatPill,
                { borderColor: active ? GREEN : BORDER, backgroundColor: active ? GREEN_BG : "#FFFFFF" },
              ]}
              onPress={() => setClubFormat(f.key)}
            >
              <f.Icon size={13} color={active ? GREEN : MUTED} strokeWidth={2} />
              <ThemedText style={[styles.formatPillText, { color: active ? GREEN : MUTED }]}>
                {f.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {clubFormat === "offline" ? (
        <>
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <MapPin size={15} color={MUTED} strokeWidth={2} />
            <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>City / Location</ThemedText>
          </View>
          <TextInput
            style={[styles.textInput, { borderColor: BORDER, color: theme.text }]}
            placeholder="e.g. Seoul, Korea"
            placeholderTextColor={MUTED}
            value={clubLocation}
            onChangeText={setClubLocation}
          />
        </>
      ) : null}

      {/* Join policy */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Users size={15} color={MUTED} strokeWidth={2} />
        <ThemedText style={[styles.sectionLabel, { color: MUTED }]}>Join policy</ThemedText>
      </View>
      <View style={styles.pillRow}>
        {[{ key: "auto" as const, label: "Open" }, { key: "approval" as const, label: "Require approval" }].map((p) => (
          <Pressable
            key={p.key}
            style={[
              styles.formatPill,
              { borderColor: joinPolicy === p.key ? GREEN : BORDER, backgroundColor: joinPolicy === p.key ? GREEN_BG : "#FFFFFF" },
            ]}
            onPress={() => setJoinPolicy(p.key)}
          >
            <ThemedText style={[styles.formatPillText, { color: joinPolicy === p.key ? GREEN : MUTED }]}>
              {p.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Create button */}
      <Pressable
        style={[
          styles.createBtn,
          { backgroundColor: clubName.trim() ? GREEN : BORDER, marginTop: 32 },
        ]}
        onPress={handleCreateClub}
        disabled={!clubName.trim() || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={[styles.createBtnText, { color: clubName.trim() ? "#FFFFFF" : MUTED }]}>
            Create Club
          </ThemedText>
        )}
      </Pressable>

      <View style={{ height: 48 }} />
    </ScrollView>
  );

  const isSessionForm = typeChoice === "session" && sessionStep === "form";
  const isClubForm = typeChoice === "club" && sessionStep === "form";

  return (
    <View style={[styles.root, { backgroundColor: "#FFFFFF" }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top, borderBottomColor: BORDER }]}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
        <ThemedText style={[styles.topBarTitle, { color: theme.text }]}>
          {sessionStep === "type" ? "New Club" : isSessionForm ? "New Session" : "New Club"}
        </ThemedText>
        <View style={{ width: 30 }} />
      </View>

      <View style={{ flex: 1 }}>
        {sessionStep === "type" && renderTypeSelect()}
        {isSessionForm && renderSessionForm()}
        {isClubForm && renderClubForm()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: "600" },
  stepContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  stepSubtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },

  // Type cards
  typeCard: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "flex-start",
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeCardBody: { flex: 1, gap: 4 },
  typeNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeName: { fontSize: 17, fontWeight: "700" },
  typePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  typePillText: { fontSize: 11, fontWeight: "600" },
  typeDesc: { fontSize: 13, lineHeight: 19 },
  typeExamples: { fontSize: 12, marginTop: 2 },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  required: { fontSize: 11, fontWeight: "500", marginLeft: 2 },
  optionalTag: { fontSize: 11, marginLeft: 2 },

  // Book search
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#FAFAFA",
  },
  searchInput: { flex: 1, fontSize: 14 },
  selectedBookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  selectedBookCover: { width: 32, height: 44, borderRadius: 4 },
  selectedBookTitle: { fontSize: 13, fontWeight: "600" },
  selectedBookAuthor: { fontSize: 12 },
  bookResultsBox: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 6,
    backgroundColor: "#FFFFFF",
  },
  bookResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bookResultCover: { width: 34, height: 48, borderRadius: 4 },
  bookResultCoverPlaceholder: { width: 34, height: 48, borderRadius: 4 },
  bookResultTitle: { fontSize: 13, fontWeight: "500" },
  bookResultAuthor: { fontSize: 12 },

  // Format grid (session)
  formatGrid: { flexDirection: "row", gap: 8 },
  formatCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 5,
  },
  formatLabel: { fontSize: 13, fontWeight: "600" },
  formatSub: { fontSize: 11, textAlign: "center" },

  // Inputs
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  textArea: { height: 80, textAlignVertical: "top", paddingTop: 11 },

  // Pill row (club format + join policy)
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  formatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  formatPillText: { fontSize: 13, fontWeight: "500" },

  // Club image picker
  imagePicker: {
    height: 120,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 20,
  },
  imagePickerFill: { width: "100%", height: "100%" },
  imagePickerInner: { alignItems: "center", gap: 6 },
  imagePickerText: { fontSize: 13 },

  // Create button
  createBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { fontSize: 15, fontWeight: "700" },
  hintText: { fontSize: 12, textAlign: "center", marginTop: 10 },
});
