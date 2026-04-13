import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import {
  Users,
  Check,
  X,
  Shield,
  UserMinus,
  ChevronLeft,
} from "lucide-react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { ClubMember, ClubApplication, ClubRole } from "@/types";
import {
  getClubMembers,
  getClubApplications,
  approveApplication,
  rejectApplication,
  updateMemberRole,
  removeMember,
  getUserMembership,
} from "@/lib/club-storage";

type TabType = "applications" | "members";

export default function ClubManagementScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "ClubManagement">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const clubId = route.params?.clubId;

  const [activeTab, setActiveTab] = useState<TabType>("applications");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [applications, setApplications] = useState<ClubApplication[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ClubRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!clubId) return;

    setIsLoading(true);
    try {
      const [membersData, applicationsData] = await Promise.all([
        getClubMembers(clubId),
        getClubApplications(clubId),
      ]);

      setMembers(membersData);
      setApplications(applicationsData);

      if (user?.id) {
        const membership = await getUserMembership(clubId, user.id);
        setCurrentUserRole(membership?.role || null);
      }
    } catch (error) {
      console.error("Error loading management data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clubId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      const result = await approveApplication(applicationId);
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        loadData();
      } else {
        Alert.alert("Error", result.error || "Failed to approve application");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    Alert.alert(
      "Reject Application",
      "Are you sure you want to reject this application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessingId(applicationId);
            try {
              const result = await rejectApplication(applicationId);
              if (result.success) {
                loadData();
              } else {
                Alert.alert("Error", result.error || "Failed to reject application");
              }
            } catch (error) {
              Alert.alert("Error", "Something went wrong");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handlePromoteToStaff = async (memberId: string, userId: string) => {
    setProcessingId(memberId);
    try {
      const result = await updateMemberRole(clubId, userId, "staff");
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        loadData();
      } else {
        Alert.alert("Error", result.error || "Failed to promote member");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDemoteToMember = async (memberId: string, userId: string) => {
    setProcessingId(memberId);
    try {
      const result = await updateMemberRole(clubId, userId, "member");
      if (result.success) {
        loadData();
      } else {
        Alert.alert("Error", result.error || "Failed to demote member");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, username: string) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${username} from the club?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setProcessingId(memberId);
            try {
              const result = await removeMember(memberId);
              if (result.success) {
                loadData();
              } else {
                Alert.alert("Error", result.error || "Failed to remove member");
              }
            } catch (error) {
              Alert.alert("Error", "Something went wrong");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: ClubRole) => {
    switch (role) {
      case "host":
        return "#E74C3C";
      case "staff":
        return "#3498DB";
      default:
        return theme.textSecondary;
    }
  };

  const renderApplicationItem = ({ item }: { item: ClubApplication }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <ThemedText style={styles.avatarText}>
              {item.username?.charAt(0).toUpperCase() || "?"}
            </ThemedText>
          </View>
          <View>
            <ThemedText style={styles.username}>{item.username || "Anonymous"}</ThemedText>
            <ThemedText style={[styles.meta, { color: theme.textSecondary }]}>
              Applied {new Date(item.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
      </View>

      {item.answers && item.answers.length > 0 ? (
        <View style={styles.answers}>
          {item.answers.map((qa, index) => (
            <View key={index} style={styles.answerItem}>
              <ThemedText style={[styles.questionText, { color: theme.textSecondary }]}>
                {typeof qa === 'string' ? `Q${index + 1}` : qa.question}
              </ThemedText>
              <ThemedText style={[styles.answerText, { color: theme.text }]}>
                {typeof qa === 'string' ? qa : qa.answer}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item.id)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={16} color="#FFFFFF" strokeWidth={2} />
              <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
          disabled={processingId === item.id}
        >
          <X size={16} color="#E74C3C" strokeWidth={2} />
          <ThemedText style={[styles.actionButtonText, { color: "#E74C3C" }]}>Reject</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderMemberItem = ({ item }: { item: ClubMember }) => {
    const isHost = item.role === "host";
    const isCurrentUser = item.userId === user?.id;
    const canManage = currentUserRole === "host" && !isHost && !isCurrentUser;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <ThemedText style={styles.avatarText}>
                {item.username?.charAt(0).toUpperCase() || "?"}
              </ThemedText>
            </View>
            <View>
              <View style={styles.usernameRow}>
                <ThemedText style={styles.username}>{item.username}</ThemedText>
                <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) + "20" }]}>
                  <ThemedText style={[styles.roleText, { color: getRoleBadgeColor(item.role) }]}>
                    {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.meta, { color: theme.textSecondary }]}>
                Joined {new Date(item.joinedAt).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {canManage ? (
          <View style={styles.actions}>
            {item.role === "member" ? (
              <Pressable
                style={[styles.actionButton, { backgroundColor: "#3498DB" }]}
                onPress={() => handlePromoteToStaff(item.id, item.userId)}
                disabled={processingId === item.id}
              >
                <Shield size={14} color="#FFFFFF" strokeWidth={2} />
                <ThemedText style={styles.actionButtonText}>Make Staff</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.actionButton, { backgroundColor: theme.border }]}
                onPress={() => handleDemoteToMember(item.id, item.userId)}
                disabled={processingId === item.id}
              >
                <ThemedText style={[styles.actionButtonText, { color: theme.text }]}>
                  Remove Staff
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRemoveMember(item.id, item.username)}
              disabled={processingId === item.id}
            >
              <UserMinus size={14} color="#E74C3C" strokeWidth={2} />
              <ThemedText style={[styles.actionButtonText, { color: "#E74C3C" }]}>Remove</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const pendingApplications = applications.filter((a) => a.status === "pending");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={theme.text} strokeWidth={1.5} />
        </Pressable>
        <ThemedText style={[styles.title, { fontFamily: "Pretendard-Bold" }]}>
          Club Management
        </ThemedText>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === "applications" && { borderBottomColor: theme.accent, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("applications")}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === "applications" ? theme.accent : theme.textSecondary },
            ]}
          >
            Applications ({pendingApplications.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === "members" && { borderBottomColor: theme.accent, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("members")}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === "members" ? theme.accent : theme.textSecondary },
            ]}
          >
            Members ({members.length})
          </ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : activeTab === "applications" ? (
        <FlatList
          data={pendingApplications}
          renderItem={renderApplicationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={theme.textSecondary} strokeWidth={1} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No pending applications
              </ThemedText>
            </View>
          }
        />
      ) : (
        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={theme.textSecondary} strokeWidth={1} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No members yet
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  placeholder: {
    width: 32,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  answers: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: Spacing.sm,
  },
  answerItem: {
    gap: 4,
  },
  questionText: {
    fontSize: 11,
    fontWeight: "500",
  },
  answerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  answer: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  approveButton: {
    backgroundColor: "#2D5A27",
  },
  rejectButton: {
    backgroundColor: "#E74C3C10",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
  },
});
