import type { TextStyle } from "react-native";

import { COLORS } from "@/constants/colors";
import { FONTS } from "@/constants/fonts";

/** Feed / social cards */
export const FeedTypography = {
  username: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.text,
  } satisfies TextStyle,
  handle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 17,
    color: COLORS.sub,
  } satisfies TextStyle,
  timestamp: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.muted,
  } satisfies TextStyle,
  body: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.text,
  } satisfies TextStyle,
  quote: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    lineHeight: 26,
    color: COLORS.quoteText,
  } satisfies TextStyle,
  bookTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.text,
  } satisfies TextStyle,
  bookMeta: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.muted,
  } satisfies TextStyle,
  actionCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.muted,
  } satisfies TextStyle,
  progressPill: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: COLORS.text,
  } satisfies TextStyle,
  progressPercent: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 17,
    color: COLORS.sub,
  } satisfies TextStyle,
};

/** Profile (Notebook) header & tabs */
export const ProfileTypography = {
  navTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.text,
  } satisfies TextStyle,
  displayName: {
    fontFamily: FONTS.semibold,
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.text,
  } satisfies TextStyle,
  handle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.sub,
  } satisfies TextStyle,
  bio: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.sub,
    textAlign: "center" as const,
  },
  editButton: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  } satisfies TextStyle,
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 24,
    color: COLORS.text,
  } satisfies TextStyle,
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 14,
    color: COLORS.muted,
    marginTop: 2,
  } satisfies TextStyle,
  tab: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
  } satisfies TextStyle,
  tabActive: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  } satisfies TextStyle,
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  } satisfies TextStyle,
};

export const Typography = {
  feed: FeedTypography,
  profile: ProfileTypography,
};
