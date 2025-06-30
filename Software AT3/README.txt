TODO
1. serperate user and teacher dashboard/profile
2. make a way to create leagues as user
3. make a way to create teams as user
4. make a way to join leagues as user
5. make a way to view teams
6. make a way to view leagues
7. make a way to view players/player stats
8. make a way to view player grade history (stats like improvement and previous grades)
9. create about page
10. create faq page
11. make leaderboard (own page and smaller addition to dashboard)
12. make a way to view and manage teams as user




Main Files
index.js
// Main application entry point
// Sets up Express server, middleware, and routes
// Connects to MongoDB and starts the server
package.json
// Project metadata and dependencies
// Defines scripts, dependencies, and project configuration
// Main dependencies: express, mongoose, ejs, bcrypt, etc.


Directory Structure
src - Source Code
/src/config
// Database configuration
// Handles MongoDB connection setup
// Uses mongoose to connect to MongoDB

/src/middleware
// Authentication middleware
// Contains isAuthenticated and isTeacher functions
// Controls access to protected routes

/src/routes/auth
// Authentication routes
// Handles user registration, login, logout
// Manages user sessions

/src/routes/dahsboard
// Dashboard routes
// Renders dashboard views for teachers and students
// Provides data for dashboard components

/src/routes/players
// Player management routes
// Handles CRUD operations for player profiles
// Includes player creation, updates, and retrieval

/src/client/js
// Scheduled tasks for leaderboard updates
// Uses node-cron for scheduling weekly and monthly tasks
// Updates team scores and resets metrics periodically

views - Frontend Templates
/views
// Player creation form template
// Form for teachers to create new player profiles
// Includes validation and feedback

/views
// Dashboard view template
// Different views for teachers and students
// Shows player lists, teams, and performance metrics

Pseudocode - System Design
/Pseudocode
// Database schema design
// Defines tables/collections for Users, Players, Teams, Leagues
// Outlines relationships between entities

/Pseudocode
// Player system design
// Defines Player class with attributes and methods
// Outlines player creation, stats, and performance tracking

node_modules - Dependencies
// External libraries and dependencies
// Installed via npm
// Includes MongoDB drivers, Express, and other packages
/public (Inferred)
// Static assets
// CSS, client-side JavaScript, images
// Served directly by Express
/models (Inferred)
// Database models
// Mongoose schemas for Users, Players, Teams, Leagues
// Defines data structure and validation


System Architecture
The system follows a typical MVC (Model-View-Controller) architecture:
Models: Mongoose schemas in /models define the data structure
Views: EJS templates in /views handle the presentation layer
Controllers: Route handlers in /src/routes process requests and responses

The application uses:
Express.js as the web framework
MongoDB (via Mongoose) for data storage
EJS for server-side templating
Express-session with MongoDB store for session management
Node-cron for scheduled tasks

The system implements a gamified educational platform where:
Teachers create player profiles for students
Students can link to their player profiles
Players join teams and leagues
Academic performance and effort are tracked and converted to points
Teams compete based on cumulative scores
Regular updates maintain competition standings
