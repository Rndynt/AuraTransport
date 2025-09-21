# Bus Travel Ticketing System

## Overview
A comprehensive production-grade MVP for a multi-stop bus travel ticketing system with customer service operator (CSO) interface and master data management capabilities.

## Project Structure
- **Frontend**: React + TypeScript with Vite build system
- **Backend**: Express.js + TypeScript server
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components

## Recent Changes
**Date: 2025-09-21**
- Fresh GitHub import successfully configured for Replit environment
- Dependencies installed and verified (517 packages up to date)
- Fixed tsx dependency issue by updating package.json script to use `npx tsx`
- PostgreSQL database provisioned using Replit's built-in database
- Database configuration verified with standard pg driver
- Database schema applied successfully using `npm run db:push`
- Database seeded with comprehensive sample data (Jakarta → Bandung route)
- Workflow "Server" configured to run `npm run dev` on port 5000 with webview output
- Express server properly configured with host 0.0.0.0 for Replit proxy compatibility
- Vite development server configured with `allowedHosts: true` for iframe proxy
- Database connection verified working (200/304 status codes on API calls)
- Application running successfully with all features functional
- Deployment configuration set up for autoscale target with proper build and start commands
- Import process completed and verified successfully

## Project Architecture
- **Client**: `/client` directory with React frontend and Vite configuration
- **Server**: `/server` directory with Express backend, routes, and services
- **Shared**: `/shared` directory containing common TypeScript schemas
- **Database**: Neon PostgreSQL with Drizzle ORM migrations

## Key Features
- Multi-stop bus route management
- Seat inventory and booking system
- Customer service operator interface
- Master data management (stops, outlets, vehicles, layouts, trip patterns)
- Real-time seat availability tracking
- Pricing rules engine
- Payment processing and ticket printing

## Environment Setup
- Node.js with TypeScript execution via tsx
- Vite dev server configured with `allowedHosts: true` for Replit proxy
- Express server serves both API routes and static frontend
- Database configured with environment variables (DATABASE_URL, etc.)

## Running the Application
- Workflow: "Server" runs `npm run dev` on port 5000
- Development server serves both backend API and frontend
- Database schema applied via `npm run db:push`
- Sample data available via seed script

## Deployment
- Target: Autoscale deployment
- Build: `npm run build` 
- Start: `npm run start`
- Production-ready Express server with static file serving