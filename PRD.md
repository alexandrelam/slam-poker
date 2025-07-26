# SLAM Poker - Product Requirements Document

## 1. Project Overview

### What is SLAM Poker?

SLAM Poker is a simple, real-time poker planning tool for agile teams to estimate story points using Fibonacci sequence. Teams can create rooms, vote simultaneously, reveal cards together, and move to the next round.

### Problem Statement

Teams need a straightforward tool to estimate story points without bias, where everyone votes simultaneously and cards are revealed together.

### Target Audience

- Development teams doing sprint planning
- Team size: 3-10 participants per session

## 2. Core Features

### 2.1 Room Management

- **Create Room**: Generate unique 6-character room code
- **Join Room**: Enter room code and user name to join
- **Room Persistence**: Keep room active during session

### 2.2 User Management

- **Simple Join**: Name-only entry (no registration required)
- **User List**: Show all participants in the room
- **Real-time Presence**: See who's online/offline

### 2.3 Voting System

- **Fibonacci Cards**: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ? (unsure)
- **Vote Selection**: Click a card to vote (hidden from others)
- **Vote Indicators**: Show who has voted (without revealing the vote)
- **Reveal Cards**: Show everyone's votes simultaneously
- **Next Round**: Clear votes and start voting on next item

### 2.4 Real-time Features

- **Live Updates**: Instant sync via WebSockets
- **Voting Progress**: Visual indicators of voting status
- **Card Reveal Animation**: Smooth reveal of all votes together

## 3. Technical Architecture

### 3.1 Technology Stack

- **Backend**: Node.js + Express + Socket.io + TypeScript
- **Frontend**: React SPA + TypeScript
- **Data**: In-memory storage (no database needed)

### 3.2 Simple Data Model

```typescript
interface Room {
  code: string;
  users: User[];
  votingInProgress: boolean;
  votesRevealed: boolean;
}

interface User {
  id: string;
  name: string;
  currentVote?: string;
  isOnline: boolean;
}
```

### 3.3 Key WebSocket Events

```typescript
// Client to Server
"join-room" | "vote" | "reveal-votes" | "next-round";

// Server to Client
"user-joined" | "user-left" | "vote-cast" | "votes-revealed" | "round-reset";
```

## 4. User Flow

### Simple Flow

1. **Create/Join Room** → Enter room code and name
2. **Vote** → Select Fibonacci card (vote is hidden)
3. **Wait** → See who has voted (without seeing votes)
4. **Reveal** → All votes shown simultaneously
5. **Next Round** → Clear votes and repeat

## 5. Success Criteria

- Room creation and joining works reliably
- Votes are hidden until reveal
- Real-time updates work for all users
- Simple, intuitive interface
