// Supabase Client Configuration
// Note: In production, use environment variables properly served from backend

const SUPABASE_URL = "https://jqbjeqotsbonhicjcewl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxYmplcW90c2JvbmhpY2pjZXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjkyNDYsImV4cCI6MjA5MTE0NTI0Nn0.-t9Xl3hois-hga3cXRAnacBvQ9dwvCAniMSXBQzIYlc";
const API_BASE_URL = "http://localhost:3000/api";

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// Auth Service
const AuthService = {
  async signup(email, password, username) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.session) {
        localStorage.setItem("session", JSON.stringify(data.session));
      }
      return data;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  },

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("session", JSON.stringify(data.session));
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  async logout() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      localStorage.removeItem("user");
      localStorage.removeItem("session");
      return data;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  getCurrentUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
};

// Trips Service
const TripsService = {
  async getAll() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return [];
      const response = await fetch(
        `${API_BASE_URL}/trips?user_id=${encodeURIComponent(user.id)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Get trips error:", error);
      throw error;
    }
  },

  async create(title, destination, start_date, end_date) {
    try {
      const user = AuthService.getCurrentUser();
      const response = await fetch(`${API_BASE_URL}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          destination,
          start_date,
          end_date,
          user_id: user?.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Create trip error:", error);
      throw error;
    }
  },

  async update(id, title, destination, start_date, end_date) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, destination, start_date, end_date }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Update trip error:", error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Delete trip error:", error);
      throw error;
    }
  },
};

// Memories Service
const MemoriesService = {
  async getAll() {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return [];
      const response = await fetch(
        `${API_BASE_URL}/memories?user_id=${encodeURIComponent(user.id)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Get memories error:", error);
      throw error;
    }
  },

  async create(trip_id, title, description, image_url) {
    try {
      const user = AuthService.getCurrentUser();
      const response = await fetch(`${API_BASE_URL}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id,
          title,
          description,
          image_url,
          user_id: user?.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Create memory error:", error);
      throw error;
    }
  },

  async update(id, description) {
    try {
      const response = await fetch(`${API_BASE_URL}/memories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Update memory error:", error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/memories/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Delete memory error:", error);
      throw error;
    }
  },
};

// Itineraries Service
const ItinerariesService = {
  async getByTrip(tripId) {
    try {
      const response = await fetch(`${API_BASE_URL}/itineraries/${tripId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Get itineraries error:", error);
      throw error;
    }
  },

  async create(trip_id, date, time, activity, description) {
    try {
      const response = await fetch(`${API_BASE_URL}/itineraries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id,
          date,
          time,
          activity,
          description,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error("Create itinerary error:", error);
      throw error;
    }
  },
};
