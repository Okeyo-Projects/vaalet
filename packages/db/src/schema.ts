import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  numeric,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})

export const searchJobs = pgTable('search_jobs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  country: varchar('country', { length: 8 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  message: text('message').notNull(),
  result: jsonb('result').$type<unknown | null>(),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  jobId: varchar('job_id', { length: 36 })
    .references(() => searchJobs.id, { onDelete: 'set null' }),
  query: text('query').notNull(),
  country: varchar('country', { length: 8 }).notNull(),
  objectiveType: varchar('objective_type', { length: 64 }).notNull(),
  targetPrice: numeric('target_price', { precision: 12, scale: 2 }),
  minPrice: numeric('min_price', { precision: 12, scale: 2 }),
  maxPrice: numeric('max_price', { precision: 12, scale: 2 }),
  dropPercent: numeric('drop_percent', { precision: 5, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 128 }).notNull(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 8 }).notNull(),
  url: text('url').notNull(),
  imageUrl: text('image_url'),
  snippet: text('snippet'),
  source: varchar('source', { length: 128 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProductUnique: uniqueIndex('favorites_user_product_unique').on(table.userId, table.productId),
}))
