export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  totalPages?: number;
}

export type ProgressType = 'page' | 'percent';
export type PostType = 'log' | 'quote' | 'review';

export interface Bookmark {
  id: string;
  userId: string;
  username: string;
  textContent: string;
  postType: PostType;
  progressType?: ProgressType;
  images: string[];
  book?: Book;
  pageNumber?: number;
  pagesRead?: number;
  percentageDelta?: number;
  rating?: number | null;
  quoteText?: string | null;
  clubId?: string;
  clubName?: string;
  visibility: BookmarkVisibility;
  createdAt: string;
}

export interface Profile {
  id: string;
  username: string;
  bio: string;
  birthYear?: number;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  city?: string;
  country?: string;
  languages?: string[];
  recentBooks: Book[];
  bookmarks: Bookmark[];
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowProfile {
  id: string;
  username: string;
}

export type MeetingMode = 'online' | 'offline' | 'hybrid';
export type JoinPolicy = 'auto' | 'approval';
export type ClubRole = 'host' | 'staff' | 'member';
export type ClubType = 'session' | 'club';
export type ClubFormat = 'offline' | 'online' | 'read_along';

export interface Club {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  meetingMode: MeetingMode;
  joinPolicy: JoinPolicy;
  city?: string;
  country?: string;
  languages?: string[];
  joinQuestions?: string[];
  welcomeTemplate?: string;
  createdAt: string;
  memberCount: number;
  type?: ClubType;
  format?: ClubFormat;
  book?: Book;
  bookId?: string;
  meetDate?: string;
  location?: string;
  link?: string;
  deadline?: string;
  sessionNumber?: number;
  hostId?: string;
  hostUsername?: string;
}

export interface ClubSession {
  id: string;
  clubId: string;
  sessionNumber: number;
  bookId?: string;
  book?: Book;
  format: ClubFormat;
  meetDate?: string;
  location?: string;
  link?: string;
  deadline?: string;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: string;
}

export interface ClubVote {
  id: string;
  clubId: string;
  bookId: string;
  book: Book;
  proposedBy: string;
  proposedByUsername: string;
  voteCount: number;
  userHasVoted: boolean;
  createdAt: string;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  username: string;
  role: ClubRole;
  joinedAt: string;
}

export interface ClubApplication {
  id: string;
  clubId: string;
  userId: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  answers?: { question: string; answer: string }[];
  createdAt: string;
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'session_join'
  | 'join_request'
  | 'join_approved'
  | 'join_rejected'
  | 'new_member'
  | 'mention';

export interface Notification {
  id: string;
  userId: string;
  actorId?: string;
  actorUsername?: string;
  type: NotificationType;
  title: string;
  message?: string;
  bookmarkId?: string;
  clubId?: string;
  data: {
    clubId?: string;
    clubName?: string;
    userId?: string;
    username?: string;
    applicationId?: string;
  };
  read: boolean;
  createdAt: string;
}

export interface ClubMeetup {
  id: string;
  clubId: string;
  title: string;
  description: string;
  dateTime: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  bookId?: string;
  createdAt: string;
}

export type BookmarkVisibility = 'public' | 'club_members';

export interface ClubBook {
  id: string;
  clubId: string;
  bookId: string;
  book: Book;
  status: 'current' | 'completed' | 'upcoming';
  addedAt: string;
}

export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
}

export interface BookmarkLike {
  id: string;
  bookmarkId: string;
  userId: string;
  createdAt: string;
}

export interface BookmarkComment {
  id: string;
  bookmarkId: string;
  userId: string;
  username: string;
  textContent: string;
  createdAt: string;
}

export interface BookmarkEngagement {
  likesCount: number;
  commentsCount: number;
  isLikedByUser: boolean;
}
