import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const clubs = pgTable("clubs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  meeting_mode: text("meeting_mode").default("online"),
  join_policy: text("join_policy").default("auto"),
  city: text("city"),
  country: text("country"),
  languages: jsonb("languages").default([]),
  join_questions: jsonb("join_questions").default([]),
  welcome_template: text("welcome_template"),
  created_at: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  data: jsonb("data").default({}),
  read: boolean("read").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const clubMembers = pgTable("club_members", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  club_id: varchar("club_id").notNull(),
  user_id: varchar("user_id").notNull(),
  role: text("role").default("member"),
  joined_at: timestamp("joined_at").defaultNow(),
});

export const clubApplications = pgTable("club_applications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  club_id: varchar("club_id").notNull(),
  user_id: varchar("user_id").notNull(),
  status: text("status").default("pending"),
  answers: jsonb("answers").default([]),
  created_at: timestamp("created_at").defaultNow(),
});

export const clubMeetups = pgTable("club_meetups", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  club_id: varchar("club_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date_time: timestamp("date_time").notNull(),
  location: text("location"),
  is_online: boolean("is_online").default(false),
  meeting_url: text("meeting_url"),
  created_at: timestamp("created_at").defaultNow(),
});

export const clubBooks = pgTable("club_books", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  club_id: varchar("club_id").notNull(),
  book_id: varchar("book_id").notNull(),
  status: text("status").default("current"),
  added_at: timestamp("added_at").defaultNow(),
});
