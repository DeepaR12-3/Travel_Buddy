# Travel Buddy - Setup Instructions

## Tech Stack

- **Frontend**: HTML5, CSS, JavaScript (ES6+)
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Prerequisites

- Node.js (v14 or higher)
- npm
- Supabase account

## Step 1: Setup Supabase

1. Create a new project at https://supabase.com
2. Go to **Project Settings** → **API**
3. Copy your **Project URL** and **Anon Key**
4. In the **SQL Editor**, create the following tables:

### Create Tables in Supabase

```sql
-- Users table (Supabase Auth handles this)
-- Note: Supabase stores auth users in the built-in auth schema, so you will not see a custom "users" table unless you create one.

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Itineraries table
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  activity VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Memories table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Profiles table (recommended for storing usernames and profile metadata)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment Variables

1. Update the `.env` file with your Supabase credentials:

   ```
   SUPABASE_URL=https://your-project-url.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   JWT_SECRET=your-jwt-secret-key
   PORT=3000
   ```

2. Update `js/supabase-client.js` with your Supabase credentials:
   ```javascript
   const SUPABASE_URL = "https://your-project-url.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-key";
   ```

## Step 4: Start the Server

```bash
npm start
```

The API will run on `http://localhost:3000`

## Step 5: Serve the Frontend

Option 1: Use VS Code Live Server extension

- Right-click on `index.html` → Open with Live Server

Option 2: Use any local HTTP server

```bash
# Using Python
python -m http.server 8000

# Using Node (http-server)
npm install -g http-server
http-server
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Trips

- `GET /api/trips` - Get all trips
- `POST /api/trips` - Create new trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Memories

- `GET /api/memories` - Get all memories
- `POST /api/memories` - Create new memory

### Itineraries

- `GET /api/itineraries/:tripId` - Get itineraries for a trip
- `POST /api/itineraries` - Create new itinerary

## Frontend Usage

The `js/supabase-client.js` file contains pre-built services:

```javascript
// Authentication
await AuthService.login(email, password);
await AuthService.signup(email, password, username);
await AuthService.logout();

// Trips
await TripsService.getAll();
await TripsService.create(title, destination, start_date, end_date);
await TripsService.update(id, title, destination, start_date, end_date);
await TripsService.delete(id);

// Memories
await MemoriesService.getAll();
await MemoriesService.create(trip_id, title, description, image_url);

// Itineraries
await ItinerariesService.getByTrip(tripId);
await ItinerariesService.create(trip_id, date, time, activity, description);
```

## Project Structure

```
Travel_Buddy/
├── index.html              # Main page
├── pages/
│   ├── home.html          # Home page
│   ├── mytrip.html        # My trips
│   ├── explore.html       # Explore destinations
│   ├── memories.html      # Travel memories
│   ├── emergency.html     # Emergency services
│   └── settings.html      # User settings
├── js/
│   ├── app.js             # Main application logic
│   └── supabase-client.js # API services
├── css/
│   └── style.css          # Styling
├── server.js              # Express server
├── package.json           # Dependencies
├── .env                   # Environment variables
└── SETUP.md              # This file
```

## Troubleshooting

1. **Port 3000 already in use**: Change PORT in `.env` and restart
2. **Supabase connection error**: Verify URL and keys in `.env` and `supabase-client.js`
3. **CORS errors**: Ensure CORS middleware is enabled in `server.js`
4. **Database connection**: Check Supabase project status and RLS policies

## Next Steps

1. Link pages in `index.html` to the page files
2. Implement UI components in each page
3. Integrate with Supabase client in `app.js`
4. Add more features (maps, recommendations, etc.)
