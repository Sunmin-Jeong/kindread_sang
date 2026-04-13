import { supabase } from "@/lib/supabase";
import type { Club, ClubMember, ClubApplication, ClubMeetup, ClubRole, Bookmark, ClubBook, Book, Notification, NotificationType, ClubVote, ClubSession } from "@/types";

export async function getClub(clubId: string): Promise<Club | null> {
  try {
    const { data: club, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", clubId)
      .single();

    if (error || !club) {
      console.error("Error fetching club:", error);
      return null;
    }

    const { count: memberCount } = await supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId);

    return {
      id: club.id,
      name: club.name,
      description: club.description || "",
      imageUrl: club.image_url,
      meetingMode: club.meeting_mode || "online",
      joinPolicy: club.join_policy || "auto",
      city: club.city,
      country: club.country,
      languages: club.languages || [],
      joinQuestions: club.join_questions || [],
      welcomeTemplate: club.welcome_template,
      createdAt: club.created_at,
      memberCount: memberCount || 0,
      type: (club.type as any) || 'club',
      format: (club.format as any) || 'online',
      bookId: club.book_id || undefined,
      meetDate: club.meet_date || undefined,
      location: club.location || undefined,
      link: club.link || undefined,
      deadline: club.deadline || undefined,
      sessionNumber: club.session_number || 1,
    };
  } catch (error) {
    console.error("Error getting club:", error);
    return null;
  }
}

export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  try {
    const { data: members, error } = await supabase
      .from("club_members")
      .select("id, club_id, user_id, role, joined_at")
      .eq("club_id", clubId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching club members:", error);
      return [];
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username");

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p.username])
    );

    return (members || []).map((member: any) => ({
      id: member.id,
      clubId: member.club_id,
      userId: member.user_id,
      username: profileMap.get(member.user_id) || "Anonymous",
      role: member.role as ClubRole,
      joinedAt: member.joined_at,
    }));
  } catch (error) {
    console.error("Error getting club members:", error);
    return [];
  }
}

export async function getClubMeetups(clubId: string): Promise<ClubMeetup[]> {
  try {
    const { data: meetups, error } = await supabase
      .from("club_meetups")
      .select("id, club_id, title, description, location, is_online, meeting_url, book_id, created_at, date_time")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42703") {
        const { data: fallbackMeetups, error: fallbackError } = await supabase
          .from("club_meetups")
          .select("id, club_id, title, description, location, created_at")
          .eq("club_id", clubId)
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.error("Error fetching meetups (fallback):", fallbackError);
          return [];
        }

        return (fallbackMeetups || []).map((meetup: any) => ({
          id: meetup.id,
          clubId: meetup.club_id,
          title: meetup.title,
          description: meetup.description || "",
          dateTime: meetup.created_at,
          location: meetup.location,
          isOnline: false,
          meetingUrl: undefined,
          createdAt: meetup.created_at,
        }));
      }
      console.error("Error fetching meetups:", error);
      return [];
    }

    return (meetups || []).map((meetup: any) => ({
      id: meetup.id,
      clubId: meetup.club_id,
      title: meetup.title,
      description: meetup.description || "",
      dateTime: meetup.date_time || meetup.created_at,
      location: meetup.location,
      isOnline: meetup.is_online || false,
      meetingUrl: meetup.meeting_url,
      bookId: meetup.book_id,
      createdAt: meetup.created_at,
    }));
  } catch (error) {
    console.error("Error getting meetups:", error);
    return [];
  }
}

export async function getClubBookmarks(clubId: string): Promise<Bookmark[]> {
  try {
    console.log("[ClubStorage] Fetching club bookmarks for clubId:", clubId);
    // Use flat schema: book_id, page_number, progress_type directly on bookmarks table
    const { data: bookmarks, error } = await supabase
      .from("bookmarks")
      .select(`
        id,
        user_id,
        text_content,
        post_type,
        images,
        book_id,
        page_number,
        progress_type,
        visibility,
        created_at
      `)
      .eq("club_id", clubId)
      .in("post_type", ["log", "quote", "review"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ClubStorage] Error fetching club bookmarks:", error);
      return [];
    }
    console.log("[ClubStorage] Successfully fetched", bookmarks?.length || 0, "bookmarks");

    // Fetch profiles for usernames
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username");

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p.username])
    );

    // Fetch books for any bookmarks that have book_id
    const bookIds = (bookmarks || [])
      .map((b: any) => b.book_id)
      .filter((id: string | null) => id !== null);

    let booksMap = new Map<string, any>();
    if (bookIds.length > 0) {
      const { data: books } = await supabase
        .from("books")
        .select("id, title, author, cover_url, isbn, total_pages")
        .in("id", bookIds);

      booksMap = new Map(
        (books || []).map((b: any) => [b.id, {
          id: b.id,
          title: b.title,
          author: b.author,
          coverUrl: b.cover_url,
          isbn: b.isbn,
          totalPages: b.total_pages,
        }])
      );
    }

    // Get club name for badge
    const { data: clubData } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", clubId)
      .single();

    return (bookmarks || []).map((bookmark: any) => ({
      id: bookmark.id,
      userId: bookmark.user_id,
      username: profileMap.get(bookmark.user_id) || "Anonymous",
      textContent: bookmark.text_content,
      postType: bookmark.post_type || "log",
      progressType: bookmark.progress_type || undefined,
      images: bookmark.images || [],
      book: bookmark.book_id ? booksMap.get(bookmark.book_id) : undefined,
      pageNumber: bookmark.page_number,
      clubId: clubId,
      clubName: clubData?.name,
      visibility: bookmark.visibility || 'club_members',
      createdAt: bookmark.created_at,
    }));
  } catch (error) {
    console.error("Error getting club bookmarks:", error);
    return [];
  }
}

export async function checkIsFirstClubPost(
  clubId: string,
  userId: string
): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error checking first post:", error);
      return false;
    }

    return (count || 0) === 0;
  } catch (error) {
    console.error("Error checking first post:", error);
    return false;
  }
}

export async function getClubWelcomeTemplate(clubId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("clubs")
      .select("welcome_template")
      .eq("id", clubId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.welcome_template;
  } catch (error) {
    console.error("Error getting welcome template:", error);
    return null;
  }
}

export async function getUserMembership(
  clubId: string,
  userId: string
): Promise<ClubMember | null> {
  try {
    const { data: member, error } = await supabase
      .from("club_members")
      .select("id, club_id, user_id, role, joined_at")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .single();

    if (error || !member) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    return {
      id: member.id,
      clubId: member.club_id,
      userId: member.user_id,
      username: profile?.username || "Anonymous",
      role: member.role as ClubRole,
      joinedAt: member.joined_at,
    };
  } catch (error) {
    console.error("Error getting user membership:", error);
    return null;
  }
}

export async function getPendingApplication(
  clubId: string,
  userId: string
): Promise<ClubApplication | null> {
  try {
    const { data: application, error } = await supabase
      .from("club_applications")
      .select("*")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .single();

    if (error || !application) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    return {
      id: application.id,
      clubId: application.club_id,
      userId: application.user_id,
      username: profile?.username || "Anonymous",
      status: application.status,
      createdAt: application.created_at,
    };
  } catch (error) {
    console.error("Error getting pending application:", error);
    return null;
  }
}

export async function joinClub(
  clubId: string,
  userId: string,
  autoJoin: boolean,
  answers?: { question: string; answer: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[ClubStorage] Join club request:", { clubId, userId, autoJoin });
    if (autoJoin) {
      const { error: memberError } = await supabase
        .from("club_members")
        .insert({
          club_id: clubId,
          user_id: userId,
          role: "member",
        });

      if (memberError) {
        console.error("Error joining club:", memberError);
        return { success: false, error: "Failed to join club" };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      await supabase.from("bookmarks").insert({
        user_id: userId,
        text_content: `${profile?.username || "A new member"} joined the club!`,
        post_type: "log",
        club_id: clubId,
        images: [],
      });

      return { success: true };
    } else {
      // Always ensure answers is a valid array (even if empty) to avoid 23502 not-null errors
      const safeAnswers = Array.isArray(answers) ? answers : [];
      
      const { error: appError } = await supabase
        .from("club_applications")
        .insert({
          club_id: clubId,
          user_id: userId,
          status: "pending",
          answers: safeAnswers,
        });

      if (appError) {
        console.error("Error submitting application:", appError);
        // Retry without answers if the column doesn't exist or has issues
        if (appError.code === "23502" || appError.code === "PGRST204" || appError.message?.includes("answers")) {
          const { error: retryError } = await supabase
            .from("club_applications")
            .insert({
              club_id: clubId,
              user_id: userId,
              status: "pending",
            });

          if (retryError) {
            console.error("Error submitting application (retry):", retryError);
            return { success: false, error: "Failed to submit application" };
          }
        } else {
          return { success: false, error: "Failed to submit application" };
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      const { data: club } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", clubId)
        .single();

      const hostId = await getClubHost(clubId);
      if (hostId) {
        await createNotification(
          hostId,
          "join_request",
          "New Join Request",
          `${profile?.username || "Someone"} wants to join ${club?.name || "your club"}`,
          { clubId, clubName: club?.name, userId, username: profile?.username }
        );
      }

      return { success: true };
    }
  } catch (error) {
    console.error("Error in joinClub:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function canUserJoinClub(
  club: Club,
  userCountry?: string
): Promise<{ canJoin: boolean; reason?: string }> {
  if (club.meetingMode === "offline" && club.country) {
    if (!userCountry) {
      return {
        canJoin: false,
        reason: `This club is offline-only in ${club.country}. Please set your country in your profile.`,
      };
    }
    if (userCountry.toLowerCase() !== club.country.toLowerCase()) {
      return {
        canJoin: false,
        reason: `This club is offline-only in ${club.country}.`,
      };
    }
  }
  return { canJoin: true };
}

export async function getAllClubs(): Promise<Club[]> {
  try {
    const { data: clubs, error } = await supabase
      .from("clubs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all clubs:", error);
      return [];
    }

    const clubIds = (clubs || []).map((c: any) => c.id);
    const memberCounts = new Map<string, number>();

    if (clubIds.length > 0) {
      for (const clubId of clubIds) {
        const { count } = await supabase
          .from("club_members")
          .select("*", { count: "exact", head: true })
          .eq("club_id", clubId);
        memberCounts.set(clubId, count || 0);
      }
    }

    return (clubs || []).map((club: any) => ({
      id: club.id,
      name: club.name,
      description: club.description || "",
      imageUrl: club.image_url,
      meetingMode: club.meeting_mode || "online",
      joinPolicy: club.join_policy || "auto",
      city: club.city,
      country: club.country,
      createdAt: club.created_at,
      memberCount: memberCounts.get(club.id) || 0,
      type: (club.type as any) || 'club',
      format: (club.format as any) || 'online',
      bookId: club.book_id || undefined,
      meetDate: club.meet_date || undefined,
      location: club.location || undefined,
      link: club.link || undefined,
      deadline: club.deadline || undefined,
      sessionNumber: club.session_number || 1,
    }));
  } catch (error) {
    console.error("Error getting all clubs:", error);
    return [];
  }
}

export async function getUserClubs(userId: string): Promise<Club[]> {
  try {
    const { data: memberships, error: memberError } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId);

    if (memberError || !memberships || memberships.length === 0) {
      return [];
    }

    const clubIds = memberships.map((m: any) => m.club_id);

    const { data: clubs, error } = await supabase
      .from("clubs")
      .select("*")
      .in("id", clubIds);

    if (error) {
      console.error("Error fetching user clubs:", error);
      return [];
    }

    const memberCounts = new Map<string, number>();
    for (const clubId of clubIds) {
      const { count } = await supabase
        .from("club_members")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId);
      memberCounts.set(clubId, count || 0);
    }

    return (clubs || []).map((club: any) => ({
      id: club.id,
      name: club.name,
      description: club.description || "",
      imageUrl: club.image_url,
      meetingMode: club.meeting_mode || "online",
      joinPolicy: club.join_policy || "auto",
      city: club.city,
      country: club.country,
      createdAt: club.created_at,
      memberCount: memberCounts.get(club.id) || 0,
      type: (club.type as any) || 'club',
      format: (club.format as any) || 'online',
      bookId: club.book_id || undefined,
      meetDate: club.meet_date || undefined,
      location: club.location || undefined,
      link: club.link || undefined,
      deadline: club.deadline || undefined,
      sessionNumber: club.session_number || 1,
    }));
  } catch (error) {
    console.error("Error getting user clubs:", error);
    return [];
  }
}

export async function getClubBooks(clubId: string): Promise<ClubBook[]> {
  try {
    let clubBooks: any[] = [];
    const { data, error } = await supabase
      .from("club_books")
      .select("id, club_id, book_id, status, added_at")
      .eq("club_id", clubId)
      .order("added_at", { ascending: false });

    if (error) {
      if (error.code === "42703" || error.message?.includes("status")) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("club_books")
          .select("id, club_id, book_id, added_at")
          .eq("club_id", clubId)
          .order("added_at", { ascending: false });

        if (fallbackError) {
          console.error("Error fetching club books (fallback):", fallbackError);
          return [];
        }

        clubBooks = (fallbackData || []).map((cb: any) => ({ ...cb, status: "current" }));
      } else {
        console.error("Error fetching club books:", error);
        return [];
      }
    } else {
      clubBooks = data || [];
    }

    if (clubBooks.length === 0) {
      return [];
    }

    const bookIds = clubBooks.map((cb: any) => cb.book_id);
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("id, title, author, cover_url, isbn, total_pages")
      .in("id", bookIds);

    if (booksError) {
      console.error("Error fetching books for club:", booksError);
      return [];
    }

    const booksMap = new Map(
      (books || []).map((b: any) => [b.id, {
        id: b.id,
        title: b.title,
        author: b.author,
        coverUrl: b.cover_url,
        isbn: b.isbn,
        totalPages: b.total_pages,
      }])
    );

    return clubBooks
      .filter((cb: any) => booksMap.has(cb.book_id))
      .map((cb: any) => ({
        id: cb.id,
        clubId: cb.club_id,
        bookId: cb.book_id,
        book: booksMap.get(cb.book_id)!,
        status: cb.status || "completed",
        addedAt: cb.added_at,
      }));
  } catch (error) {
    console.error("Error getting club books:", error);
    return [];
  }
}

export async function updateClubBookStatus(
  clubBookId: string,
  status: 'current' | 'upcoming' | 'completed'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("club_books")
      .update({ status })
      .eq("id", clubBookId);

    if (error) {
      if (error.code === "42703" || error.message?.includes("status")) {
        return { success: true };
      }
      console.error("Error updating club book status:", error);
      return { success: false, error: "Failed to update book status" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateClubBookStatus:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function syncBookshelfWithMeetups(clubId: string): Promise<void> {
  try {
    const meetups = await getClubMeetups(clubId);
    const clubBooks = await getClubBooks(clubId);
    const now = new Date();

    for (const meetup of meetups) {
      if (!meetup.bookId) continue;

      const clubBook = clubBooks.find(cb => cb.bookId === meetup.bookId);
      if (!clubBook) continue;

      const meetupDate = new Date(meetup.dateTime);
      const newStatus = meetupDate > now ? 'upcoming' : 'completed';

      if (clubBook.status !== newStatus) {
        await updateClubBookStatus(clubBook.id, newStatus);
      }
    }
  } catch (error) {
    console.error("Error syncing bookshelf with meetups:", error);
  }
}

export async function createMeetup(
  clubId: string,
  title: string,
  description: string,
  dateTime: Date,
  isOnline: boolean,
  location?: string,
  meetingUrl?: string,
  bookId?: string
): Promise<{ success: boolean; meetupId?: string; error?: string }> {
  try {
    const insertData: any = {
      club_id: clubId,
      title,
      description: description || null,
      is_online: isOnline,
      location: location || null,
      meeting_url: meetingUrl || null,
      book_id: bookId || null,
    };

    let result = await supabase
      .from("club_meetups")
      .insert({ ...insertData, date_time: dateTime.toISOString() })
      .select("id")
      .single();

    if (result.error?.code === "42703") {
      result = await supabase
        .from("club_meetups")
        .insert(insertData)
        .select("id")
        .single();
    }

    if (result.error || !result.data) {
      console.error("Error creating meetup:", result.error);
      return { success: false, error: "Failed to create meetup" };
    }

    if (bookId) {
      const clubBooks = await getClubBooks(clubId);
      const clubBook = clubBooks.find(cb => cb.bookId === bookId);
      if (clubBook) {
        const now = new Date();
        const newStatus = dateTime > now ? 'upcoming' : 'completed';
        await updateClubBookStatus(clubBook.id, newStatus);
      }
    }

    return { success: true, meetupId: result.data.id };
  } catch (error) {
    console.error("Error in createMeetup:", error);
    return { success: false, error: "An error occurred" };
  }
}

export function rankClubs(
  clubs: Club[],
  userLanguages?: string[],
  userCity?: string,
  userCountry?: string
): Club[] {
  return clubs.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (userCountry) {
      if (a.country?.toLowerCase() === userCountry.toLowerCase()) scoreA += 3;
      if (b.country?.toLowerCase() === userCountry.toLowerCase()) scoreB += 3;
    }

    if (userCity) {
      if (a.city?.toLowerCase() === userCity.toLowerCase()) scoreA += 2;
      if (b.city?.toLowerCase() === userCity.toLowerCase()) scoreB += 2;
    }

    scoreA += (a.memberCount || 0) * 0.01;
    scoreB += (b.memberCount || 0) * 0.01;

    return scoreB - scoreA;
  });
}

export interface CreateClubInput {
  name: string;
  description?: string;
  imageUrl?: string;
  meetingMode: "online" | "offline" | "hybrid";
  joinPolicy: "auto" | "approval";
  city?: string;
  country?: string;
  languages?: string[];
  joinQuestions?: string[];
  welcomeTemplate?: string;
}

export async function createClub(
  input: CreateClubInput,
  creatorId: string
): Promise<{ success: boolean; clubId?: string; error?: string }> {
  try {
    console.log("[ClubStorage] Creating club:", input.name);
    // First try with all fields
    let { data: club, error: clubError } = await supabase
      .from("clubs")
      .insert({
        name: input.name,
        description: input.description || null,
        image_url: input.imageUrl || null,
        meeting_mode: input.meetingMode,
        join_policy: input.joinPolicy,
        city: input.city || null,
        country: input.country || null,
        languages: input.languages || [],
        join_questions: input.joinQuestions || [],
        welcome_template: input.welcomeTemplate || null,
      })
      .select("id")
      .single();

    // If schema cache error, retry without languages/join_questions
    if (clubError?.code === "PGRST204") {
      console.log("Retrying without languages/join_questions due to schema cache issue");
      const retry = await supabase
        .from("clubs")
        .insert({
          name: input.name,
          description: input.description || null,
          image_url: input.imageUrl || null,
          meeting_mode: input.meetingMode,
          join_policy: input.joinPolicy,
          city: input.city || null,
          country: input.country || null,
        })
        .select("id")
        .single();
      club = retry.data;
      clubError = retry.error;
    }

    if (clubError || !club) {
      console.error("[ClubStorage] Error creating club:", clubError);
      return { success: false, error: "Failed to create club" };
    }
    console.log("[ClubStorage] Club created successfully:", club.id);

    const { error: memberError } = await supabase
      .from("club_members")
      .insert({
        club_id: club.id,
        user_id: creatorId,
        role: "host",
      });

    if (memberError) {
      console.error("Error adding creator as host:", memberError);
    }

    return { success: true, clubId: club.id };
  } catch (error) {
    console.error("Error in createClub:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function addClubBook(
  clubId: string,
  bookId: string,
  status: "current" | "upcoming" | "completed" = "current"
): Promise<{ success: boolean; error?: string }> {
  try {
    let result = await supabase.from("club_books").insert({
      club_id: clubId,
      book_id: bookId,
      status: status,
    });

    if (result.error) {
      if (result.error.code === "PGRST204" || result.error.message?.includes("status")) {
        result = await supabase.from("club_books").insert({
          club_id: clubId,
          book_id: bookId,
        });

        if (result.error) {
          console.error("Error adding club book (retry):", result.error);
          return { success: false, error: "Failed to add book" };
        }

        return { success: true };
      }

      console.error("Error adding club book:", result.error);
      return { success: false, error: "Failed to add book" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in addClubBook:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function getClubApplications(clubId: string): Promise<ClubApplication[]> {
  try {
    const { data: applications, error } = await supabase
      .from("club_applications")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching club applications:", error);
      return [];
    }

    const userIds = [...new Set((applications || []).map((a: any) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.username]));

    return (applications || []).map((app: any) => ({
      id: app.id,
      clubId: app.club_id,
      userId: app.user_id,
      username: profileMap.get(app.user_id) || "Anonymous",
      status: app.status,
      answers: app.answers || [],
      createdAt: app.created_at,
    }));
  } catch (error) {
    console.error("Error getting club applications:", error);
    return [];
  }
}

export async function approveApplication(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: app, error: fetchError } = await supabase
      .from("club_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !app) {
      return { success: false, error: "Application not found" };
    }

    const { error: updateError } = await supabase
      .from("club_applications")
      .update({ status: "approved" })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Error approving application:", updateError);
      return { success: false, error: "Failed to approve application" };
    }

    const { error: memberError } = await supabase.from("club_members").insert({
      club_id: app.club_id,
      user_id: app.user_id,
      role: "member",
    });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return { success: false, error: "Failed to add as member" };
    }

    const { data: club } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", app.club_id)
      .single();

    await createNotification(
      app.user_id,
      "join_approved",
      "Application Approved!",
      `Congratulations! Your request to join ${club?.name || "the club"} was approved.`,
      { clubId: app.club_id, clubName: club?.name }
    );

    return { success: true };
  } catch (error) {
    console.error("Error in approveApplication:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function rejectApplication(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("club_applications")
      .update({ status: "rejected" })
      .eq("id", applicationId);

    if (error) {
      console.error("Error rejecting application:", error);
      return { success: false, error: "Failed to reject application" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in rejectApplication:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function updateMemberRole(
  clubId: string,
  userId: string,
  role: ClubRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("club_members")
      .update({ role })
      .eq("club_id", clubId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating member role:", error);
      return { success: false, error: "Failed to update role" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateMemberRole:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function removeMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Error removing member:", error);
      return { success: false, error: "Failed to remove member" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in removeMember:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function getOrCreateBook(book: {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  totalPages?: number;
}): Promise<string | null> {
  try {
    if (book.isbn) {
      const { data: existing } = await supabase
        .from("books")
        .select("id")
        .eq("isbn", book.isbn)
        .single();

      if (existing) {
        return existing.id;
      }
    }

    const { data: newBook, error } = await supabase
      .from("books")
      .insert({
        title: book.title,
        author: book.author,
        cover_url: book.coverUrl || null,
        isbn: book.isbn || null,
        total_pages: book.totalPages || null,
      })
      .select("id")
      .single();

    if (error || !newBook) {
      console.error("Error creating book:", error);
      return null;
    }

    return newBook.id;
  } catch (error) {
    console.error("Error in getOrCreateBook:", error);
    return null;
  }
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message?: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message: message || null,
      data: data || {},
      read: false,
    });

    if (error) {
      if (error.code === "PGRST204" || error.message?.includes("data")) {
        const { error: retryError } = await supabase.from("notifications").insert({
          user_id: userId,
          type,
          title,
          message: message || null,
          read: false,
        });
        if (retryError) {
          console.error("Error creating notification (retry):", retryError);
          return { success: false, error: "Failed to create notification" };
        }
        return { success: true };
      }
      console.error("Error creating notification:", error);
      return { success: false, error: "Failed to create notification" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in createNotification:", error);
    return { success: false, error: "An error occurred" };
  }
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, message, data, read, created_at, actor_id, bookmark_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      const { data: fallback } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, message, data, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      return (fallback || []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data || {},
        read: n.read || false,
        createdAt: n.created_at,
      }));
    }

    const actorIds = [...new Set(
      (notifications || []).filter((n: any) => n.actor_id).map((n: any) => n.actor_id)
    )];
    let actorMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", actorIds);
      actorMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));
    }

    return (notifications || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      actorId: n.actor_id || undefined,
      actorUsername: n.actor_id ? actorMap.get(n.actor_id) : undefined,
      type: n.type,
      title: n.title,
      message: n.message,
      bookmarkId: n.bookmark_id || undefined,
      data: n.data || {},
      read: n.read || false,
      createdAt: n.created_at,
    }));
  } catch (error) {
    console.error("Error getting notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch (error) {
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

export async function getClubHost(clubId: string): Promise<string | null> {
  try {
    const { data: host, error } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("role", "host")
      .single();

    if (error || !host) {
      return null;
    }

    return host.user_id;
  } catch (error) {
    console.error("Error getting club host:", error);
    return null;
  }
}

// ─── Session creation (type='session') ──────────────────────────────────────

export interface CreateSessionInput {
  name?: string;
  format: 'offline' | 'online' | 'read_along';
  bookId: string;
  meetDate?: string;
  location?: string;
  link?: string;
  deadline?: string;
  languageCode?: string;
  description?: string;
}

export async function createSession(
  input: CreateSessionInput,
  creatorId: string
): Promise<{ success: boolean; clubId?: string; error?: string }> {
  try {
    const insertData: any = {
      name: input.name || "Unnamed Session",
      description: input.description || "",
      type: 'session',
      format: input.format,
      book_id: input.bookId,
      meeting_mode: input.format === 'offline' ? 'offline' : 'online',
      join_policy: 'auto',
      host_id: creatorId,
      require_approval: false,
      language_code: input.languageCode || 'en',
    };
    if (input.meetDate) insertData.meet_date = input.meetDate;
    if (input.location) insertData.location = input.location;
    if (input.link) insertData.link = input.link;
    if (input.deadline) insertData.deadline = input.deadline;

    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .insert(insertData)
      .select("id")
      .single();

    if (clubError || !club) {
      console.error("[ClubStorage] Error creating session:", clubError);
      return { success: false, error: "Failed to create session" };
    }

    await supabase.from("club_members").insert({
      club_id: club.id,
      user_id: creatorId,
      role: "host",
    });

    return { success: true, clubId: club.id };
  } catch (error) {
    console.error("Error in createSession:", error);
    return { success: false, error: "An error occurred" };
  }
}

// ─── Club votes (for ongoing clubs) ──────────────────────────────────────────

export async function getClubVotes(
  clubId: string,
  currentUserId?: string
): Promise<ClubVote[]> {
  try {
    const { data: votes, error } = await supabase
      .from("club_votes")
      .select("id, club_id, book_id, proposed_by, created_at, books(id, title, author, cover_url)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205" || error.code === "42703") return [];
      console.error("Error fetching club votes:", error);
      return [];
    }

    const voteIds = (votes || []).map((v: any) => v.id);
    const { data: responses } = voteIds.length > 0 ? await supabase
      .from("club_vote_responses")
      .select("vote_id, user_id")
      .in("vote_id", voteIds) : { data: [] };

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username");

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));
    const responseMap = new Map<string, string[]>();
    for (const r of responses || []) {
      if (!responseMap.has((r as any).vote_id)) responseMap.set((r as any).vote_id, []);
      responseMap.get((r as any).vote_id)!.push((r as any).user_id);
    }

    return (votes || []).map((v: any) => ({
      id: v.id,
      clubId: v.club_id,
      bookId: v.book_id,
      book: {
        id: v.books?.id || v.book_id,
        title: v.books?.title || "Unknown",
        author: v.books?.author || "",
        coverUrl: v.books?.cover_url || null,
      },
      proposedBy: v.proposed_by,
      proposedByUsername: profileMap.get(v.proposed_by) || "Unknown",
      voteCount: (responseMap.get(v.id) || []).length,
      userHasVoted: currentUserId ? (responseMap.get(v.id) || []).includes(currentUserId) : false,
      createdAt: v.created_at,
    }));
  } catch (error) {
    console.error("Error getting club votes:", error);
    return [];
  }
}

export async function addClubVoteCandidate(
  clubId: string,
  bookId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("club_votes").insert({
      club_id: clubId,
      book_id: bookId,
      proposed_by: userId,
    });
    if (error) {
      if (error.code === "42P01") return { success: false, error: "Votes table not set up. Run migration first." };
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to add candidate" };
  }
}

export async function toggleVoteResponse(
  voteId: string,
  userId: string
): Promise<{ voted: boolean }> {
  try {
    const { data: existing } = await supabase
      .from("club_vote_responses")
      .select("id")
      .eq("vote_id", voteId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase.from("club_vote_responses").delete().eq("id", existing.id);
      return { voted: false };
    } else {
      await supabase.from("club_vote_responses").insert({ vote_id: voteId, user_id: userId });
      return { voted: true };
    }
  } catch {
    return { voted: false };
  }
}

// ─── Club sessions (for ongoing clubs) ───────────────────────────────────────

export async function getClubSessions(clubId: string): Promise<ClubSession[]> {
  try {
    const { data: sessions, error } = await supabase
      .from("club_sessions")
      .select("*, books(id, title, author, cover_url, total_pages)")
      .eq("club_id", clubId)
      .order("session_number", { ascending: false });

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205" || error.code === "42703") return [];
      console.error("Error fetching club sessions:", error);
      return [];
    }

    return (sessions || []).map((s: any) => ({
      id: s.id,
      clubId: s.club_id,
      sessionNumber: s.session_number,
      bookId: s.book_id,
      book: s.books ? {
        id: s.books.id,
        title: s.books.title,
        author: s.books.author,
        coverUrl: s.books.cover_url,
        totalPages: s.books.total_pages,
      } : undefined,
      format: s.format || 'online',
      meetDate: s.meet_date,
      location: s.location,
      link: s.link,
      deadline: s.deadline,
      status: s.status || 'upcoming',
      createdAt: s.created_at,
    }));
  } catch (error) {
    console.error("Error getting club sessions:", error);
    return [];
  }
}
