# Micro-Blogging Platform Entity Schema

This document outlines the entity schema for a micro-blogging platform with comment support and AI vector embedding capabilities.

## Core Entities

### User
- **Purpose**: Represents a user of the platform
- **Fields**:
  - `id`: UUID primary key
  - `username`: Unique username
  - `email`: Unique email address
  - `emailVerified`: Timestamp when email was verified
  - `password`: Hashed password
  - `displayName`: User's display name
  - `bio`: Short user biography
  - `profileImage`: URL to profile image
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

### Post
- **Purpose**: Represents a micro-blog post
- **Fields**:
  - `id`: UUID primary key
  - `userId`: Foreign key to User
  - `content`: Text content of the post
  - `isPublished`: Boolean indicating if post is published
  - `viewCount`: Number of views
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

### Comment
- **Purpose**: Represents a comment on a post
- **Fields**:
  - `id`: UUID primary key
  - `postId`: Foreign key to Post
  - `userId`: Foreign key to User
  - `content`: Text content of the comment
  - `parentId`: Self-referencing foreign key for nested comments (nullable)
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

### PostEmbedding
- **Purpose**: Stores vector embeddings for posts to enable semantic search
- **Fields**:
  - `id`: UUID primary key
  - `postId`: Foreign key to Post (unique)
  - `embedding`: Vector representation of post content (1536 dimensions)
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

## Engagement Entities

### Like
- **Purpose**: Tracks likes on posts and comments
- **Fields**:
  - `id`: UUID primary key
  - `userId`: Foreign key to User
  - `postId`: Foreign key to Post (nullable)
  - `commentId`: Foreign key to Comment (nullable)
  - `createdAt`: Timestamp

### Follow
- **Purpose**: Tracks user following relationships
- **Fields**:
  - `id`: UUID primary key
  - `followerId`: Foreign key to User (who is following)
  - `followedId`: Foreign key to User (who is being followed)
  - `createdAt`: Timestamp

## Content Organization

### Tag
- **Purpose**: Represents a topic tag for posts
- **Fields**:
  - `id`: UUID primary key
  - `name`: Unique tag name
  - `createdAt`: Timestamp

### PostTag
- **Purpose**: Many-to-many relationship between Posts and Tags
- **Fields**:
  - `id`: UUID primary key
  - `postId`: Foreign key to Post
  - `tagId`: Foreign key to Tag
  - `createdAt`: Timestamp

## Analytics and Settings

### UserSettings
- **Purpose**: Stores user preferences and settings
- **Fields**:
  - `id`: UUID primary key
  - `userId`: Foreign key to User (unique)
  - `notificationsEnabled`: Boolean
  - `privacyLevel`: Enum (public, private, friends)
  - `theme`: User interface theme preference
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

### PostAnalytics
- **Purpose**: Tracks detailed analytics for posts
- **Fields**:
  - `id`: UUID primary key
  - `postId`: Foreign key to Post (unique)
  - `impressions`: Count of impressions
  - `clickThroughRate`: Percentage of clicks
  - `averageReadTime`: Average time spent reading
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

## Implementation Notes

1. All entities should extend from a base entity class that provides common fields like `id`, `createdAt`, and `updatedAt`.
2. User-owned entities should extend from a user-owned entity class that adds the `userId` field.
3. The `PostEmbedding` entity uses vector embeddings to enable semantic search capabilities.
4. The comment system supports nested comments through the self-referencing `parentId` field.
5. The schema supports both post and comment likes through nullable foreign keys.
