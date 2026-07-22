const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();

// Middleware
app.use(express.json({ limit: "20mb" }));
app.use(cors());
app.use(express.static("."));

// Supabase Client (server-side should use the service role key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// Routes
app.get("/api/health", (req, res) => {
  res.json({ message: "Travel Buddy API is running" });
});

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
        },
      });

    if (createError)
      return res.status(400).json({ error: createError.message });

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) return res.status(400).json({ error: loginError.message });

    let profile = null;
    if (username && createData.user?.id) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            user_id: createData.user.id,
            username,
            created_at: new Date(),
          },
        ])
        .select();

      if (profileError) {
        return res.status(400).json({ error: profileError.message });
      }
      profile = profileData?.[0] || null;
    }

    res.json({ user: loginData.user, session: loginData.session, profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ user: data.user, session: data.session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trips Routes
app.get("/api/trips", async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trips", async (req, res) => {
  try {
    const { title, destination, start_date, end_date, user_id } = req.body;

    const { data, error } = await supabase
      .from("trips")
      .insert([
        {
          title,
          destination,
          start_date,
          end_date,
          user_id,
          created_at: new Date(),
        },
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/trips/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, destination, start_date, end_date } = req.body;

    const { data, error } = await supabase
      .from("trips")
      .update({ title, destination, start_date, end_date })
      .eq("id", id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/trips/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("trips").delete().eq("id", id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memories Routes
app.get("/api/memories", async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/memories", async (req, res) => {
  try {
    const { trip_id, title, description, image_url, user_id } = req.body;

    const { data, error } = await supabase
      .from("memories")
      .insert([
        {
          trip_id,
          title,
          description,
          image_url,
          user_id,
          created_at: new Date(),
        },
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/memories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    const { data, error } = await supabase
      .from("memories")
      .update({ description })
      .eq("id", id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/memories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("memories").delete().eq("id", id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Memory deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Itineraries Routes
app.get("/api/itineraries/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("trip_id", tripId)
      .order("date", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/itineraries", async (req, res) => {
  try {
    const { trip_id, date, time, activity, description } = req.body;

    const { data, error } = await supabase
      .from("itineraries")
      .insert([
        {
          trip_id,
          date,
          time,
          activity,
          description,
          created_at: new Date(),
        },
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
let currentPort = DEFAULT_PORT;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n✅ Travel Buddy API is running!`);
    console.log(`📍 Server: http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const fallbackPort = port + 1;
      if (fallbackPort <= 3010) {
        console.warn(
          `Port ${port} is already in use. Trying port ${fallbackPort}...`,
        );
        currentPort = fallbackPort;
        startServer(fallbackPort);
      } else {
        console.error(
          `Unable to start server: all ports from ${DEFAULT_PORT} to ${fallbackPort} are in use.`,
        );
        process.exit(1);
      }
    } else {
      console.error("Server error:", error);
      process.exit(1);
    }
  });
}

startServer(currentPort);
