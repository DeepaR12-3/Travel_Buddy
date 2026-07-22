// Travel Buddy App JavaScript

let currentUser = AuthService.getCurrentUser();
let currentMemoryPreview = null;

const START_LOCATION_SUGGESTIONS = [
  "Agra, Uttar Pradesh",
  "Goa",
  "Kerala",
  "Jaipur, Rajasthan",
  "Varanasi, Uttar Pradesh",
  "Mumbai, Maharashtra",
  "Udaipur, Rajasthan",
  "Rishikesh, Uttarakhand",
  "Amritsar, Punjab",
  "Delhi",
  "Bangalore",
  "Kochi, Kerala",
  "Hyderabad, Telangana",
];

const START_LOCATION_COORDINATES = {
  "agra, uttar pradesh": { lat: 27.1767, lng: 78.0081 },
  goa: { lat: 15.2993, lng: 73.8243 },
  kerala: { lat: 10.8505, lng: 76.2711 },
  "jaipur, rajasthan": { lat: 26.9124, lng: 75.7873 },
  "varanasi, uttar pradesh": { lat: 25.3282, lng: 82.9789 },
  "mumbai, maharashtra": { lat: 19.0761, lng: 72.8775 },
  "udaipur, rajasthan": { lat: 24.5854, lng: 73.712 },
  "rishikesh, uttarakhand": { lat: 30.0885, lng: 78.2676 },
  "amritsar, punjab": { lat: 31.634, lng: 74.8711 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  "kochi, kerala": { lat: 9.9312, lng: 76.2673 },
  "hyderabad, telangana": { lat: 17.3592, lng: 78.4594 },
};

async function signUp(email, password, username) {
  return AuthService.signup(email, password, username);
}

async function signIn(email, password) {
  return AuthService.login(email, password);
}

async function signOut() {
  await AuthService.logout();
  currentUser = null;
  updateAuthUI();
  loadPage("home");
}

// Navigation
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  loadPage("home");
});

window.addEventListener("hashchange", () => {
  const page = window.location.hash.substring(1) || "home";
  loadPage(page);
});

async function checkAuth() {
  currentUser = AuthService.getCurrentUser();
  updateAuthUI();
}

function updateAuthUI() {
  const nav = document.querySelector("nav ul");
  nav.querySelectorAll(".auth-item").forEach((item) => item.remove());

  if (currentUser) {
    const displayName =
      currentUser.user_metadata?.username || currentUser.email || "Profile";
    const profileText = currentUser.user_metadata?.username
      ? `${currentUser.user_metadata.username}`
      : displayName;
    const profileEmail = currentUser.email || "";

    const profileItem = document.createElement("li");
    profileItem.className = "auth-item profile-item";
    profileItem.innerHTML = `
      <button class="profile-button" id="profileButton">
        <i class="fas fa-user-circle"></i> ${profileText}
      </button>
      <div class="profile-menu hidden" id="profileMenu">
        <p class="profile-menu-name">${profileText}</p>
        <p class="profile-menu-email">${profileEmail}</p>
        <button class="btn btn-secondary" id="logout">Logout</button>
      </div>
    `;
    nav.appendChild(profileItem);

    document
      .getElementById("profileButton")
      .addEventListener("click", (event) => {
        event.preventDefault();
        document.getElementById("profileMenu").classList.toggle("hidden");
      });
    document
      .getElementById("logout")
      .addEventListener("click", async (event) => {
        event.preventDefault();
        await signOut();
      });

    document.addEventListener("click", (event) => {
      const profileMenu = document.getElementById("profileMenu");
      if (
        profileMenu &&
        !event.target.closest(".profile-item") &&
        !profileMenu.classList.contains("hidden")
      ) {
        profileMenu.classList.add("hidden");
      }
    });
  } else {
    const loginItem = document.createElement("li");
    loginItem.className = "auth-item";
    loginItem.innerHTML = '<a href="#login" id="login">Login</a>';
    nav.appendChild(loginItem);
  }
}

// Map Modal Function - Opens destination map in a modal like Google Maps
function openMapModal(destination) {
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "map-modal-overlay";
  modalOverlay.innerHTML = `
    <div class="map-modal-container">
      <div class="map-modal-header">
        <h2><i class="fas fa-map-marker-alt"></i> ${getDestinationTitle(destination)}</h2>
        <button class="map-modal-close" aria-label="Close map">&times;</button>
      </div>
      <div class="map-modal-content">
        <div id="mapModalContainer" class="map-modal-map"></div>
        <div class="map-modal-info">
          <h3>📍 Destination Details</h3>
          <p>${getDestinationDescription(destination)}</p>
          <div class="location-selector-panel" style="margin-top:12px; position: relative;">
            <p style="margin-bottom: 8px; color:#333; font-weight:600;">
              Route planning uses your current device location automatically.
            </p>
            <small style="color:#666;display:block;margin-top:6px">
              Please allow location access so the app can calculate the route from where you are.
            </small>
          </div>
          <div class="map-route-summary" id="mapRouteSummary">
            Loading route from your current location...
          </div>
          <div class="attractions-section">
            <h4><i class="fas fa-compass"></i> Nearby Attractions & Distance</h4>
            <ul id="mapModalAttractions" class="attractions-list google-maps-style"></ul>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Close modal functionality
  const closeBtn = modalOverlay.querySelector(".map-modal-close");
  closeBtn.addEventListener("click", () => {
    modalOverlay.remove();
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });

  // Initialize map after modal is rendered
  setTimeout(() => {
    const mapManager = new MapManager();
    mapManager.initMap("mapModalContainer");

    const coords = getDestinationCoordinates(destination);
    mapManager.addMarker(
      coords.lat,
      coords.lng,
      coords.title,
      "Main Destination",
      "green",
    );
    mapManager.map.setView([coords.lat, coords.lng], 12);

    const routeSummary = document.getElementById("mapRouteSummary");

    async function drawRouteFromCurrentLocation() {
      routeSummary.textContent =
        "Calculating route from your current location...";
      try {
        const location = await mapManager.getCurrentLocation();
        if (!location) throw new Error("No current location");
        mapManager.addMarker(
          location.lat,
          location.lng,
          "Start",
          "Your current location",
          "red",
        );
        await mapManager.drawRoute([
          { lat: location.lat, lng: location.lng },
          coords,
        ]);
        const distanceKm = mapManager.calculateDistance(
          location.lat,
          location.lng,
          coords.lat,
          coords.lng,
        );
        if (routeSummary) {
          routeSummary.innerHTML = `<strong>Route</strong>: ${distanceKm} km from <strong>Your current location</strong> to <strong>${coords.title}</strong>`;
        }
      } catch (error) {
        console.error("Route error:", error);
        routeSummary.textContent =
          "Unable to access your current location. Please allow location access and refresh the page.";
      }
    }

    drawRouteFromCurrentLocation();

    // Add nearby attractions with routes
    const attractions = getNearbyAttractions(destination);
    const attractionsList = document.getElementById("mapModalAttractions");

    if (attractions.length > 0) {
      attractionsList.innerHTML = attractions
        .map((attr, idx) => {
          const distanceValue = parseFloat(attr.distance).toFixed(2);
          return `
        <li class="attraction-item" data-index="${idx}">
          <div class="attraction-marker-number">${idx + 1}</div>
          <div class="attraction-details">
            <div class="attraction-name">${attr.name}</div>
            <span class="attraction-type"><i class="fas fa-tag"></i> ${attr.type}</span>
          </div>
          <div class="attraction-distance-box">
            <div class="distance-value">${isNaN(distanceValue) ? attr.distance : distanceValue}</div>
            <div class="distance-label">km</div>
          </div>
        </li>`;
        })
        .join("");

      attractions.forEach((attr, idx) => {
        mapManager.addMarker(
          attr.lat,
          attr.lng,
          attr.name,
          `${idx + 1}. ${attr.type}`,
          "blue",
        );

        // Add click handler to show route
        const item = attractionsList.querySelector(`[data-index="${idx}"]`);
        item.onclick = () => {
          // Draw route from main destination to this attraction
          mapManager.clearPolylines();
          mapManager.drawRoute([
            { lat: coords.lat, lng: coords.lng },
            { lat: attr.lat, lng: attr.lng },
          ]);

          const routeSummaryElem = document.getElementById("mapRouteSummary");
          if (routeSummaryElem) {
            routeSummaryElem.innerHTML = `<strong>Route</strong>: ${attr.distance} from ${coords.title} to ${attr.name}`;
          }

          // Highlight the selected item
          attractionsList.querySelectorAll(".attraction-item").forEach((el) => {
            el.classList.remove("active");
          });
          item.classList.add("active");

          // Zoom to show both points
          const bounds = L.latLngBounds([
            [coords.lat, coords.lng],
            [attr.lat, attr.lng],
          ]);
          mapManager.map.fitBounds(bounds, { padding: [50, 50] });
        };
      });
    }
  }, 100);
}

const DESTINATION_DATA = {
  agra: {
    title: "Agra, Uttar Pradesh",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
    description:
      "Home to the iconic Taj Mahal, historic forts, and Mughal architecture.",
  },
  goa: {
    title: "Goa",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    description:
      "Sun-soaked beaches, coastal cuisine, and a relaxed seaside vibe.",
  },
  kerala: {
    title: "Kerala",
    image:
      "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
    description:
      "Backwaters, spice gardens, and calm houseboat journeys in God's Own Country.",
  },
  jaipur: {
    title: "Jaipur, Rajasthan",
    image:
      "https://images.unsplash.com/photo-1544008230-ac1e1fb4f4f4?auto=format&fit=crop&w=1200&q=80",
    description:
      "The Pink City with grand palaces, forts, and vibrant bazaars.",
  },
  varanasi: {
    title: "Varanasi, Uttar Pradesh",
    image:
      "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1200&q=80",
    description:
      "Spiritual ghats, ancient temples, and sacred evening rituals on the Ganges.",
  },
  mumbai: {
    title: "Mumbai, Maharashtra",
    image:
      "https://images.unsplash.com/photo-1525107715559-3bf44714a7f0?auto=format&fit=crop&w=1200&q=80",
    description:
      "Bollywood energy, Marine Drive sunsets, and iconic coastal landmarks.",
  },
  udaipur: {
    title: "Udaipur, Rajasthan",
    image:
      "https://images.unsplash.com/photo-1528569937393-7ec9a4fc9af8?auto=format&fit=crop&w=1200&q=80",
    description: "Romantic lakes, royal palaces, and charming heritage hotels.",
  },
  rishikesh: {
    title: "Rishikesh, Uttarakhand",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80",
    description:
      "Yoga, river rafting, and spiritual retreats beside the Ganges.",
  },
  amritsar: {
    title: "Amritsar, Punjab",
    image:
      "https://images.unsplash.com/photo-1584573992515-d068fb9d4c7e?auto=format&fit=crop&w=1200&q=80",
    description:
      "Home to the Golden Temple, Punjabi cuisine, and rich cultural heritage.",
  },
};

function normalizeDestination(destination) {
  return destination?.toString().trim().toLowerCase() || "";
}

function getDestinationData(destination) {
  return (
    DESTINATION_DATA[normalizeDestination(destination)] || {
      title: destination || "Beautiful Destination",
      image:
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
      description: "Explore this beautiful destination on your next trip.",
    }
  );
}

function getDestinationImage(destination) {
  return getDestinationData(destination).image;
}

function getDestinationTitle(destination) {
  return getDestinationData(destination).title;
}

function getDestinationDescription(destination) {
  return getDestinationData(destination).description;
}

function showAuthModal() {
  const modal = document.createElement("div");
  modal.className = "auth-modal-overlay";
  modal.innerHTML = `
    <div class="auth-modal">
      <h3>Login / Sign Up</h3>
      <input type="email" id="authEmail" placeholder="Email" required />
      <input type="password" id="authPassword" placeholder="Password" required />
      <input type="text" id="authUsername" placeholder="Username (for sign up)" />
      <div class="auth-actions">
        <button id="signInBtn" class="btn">Sign In</button>
        <button id="signUpBtn" class="btn">Sign Up</button>
      </div>
      <button id="closeModal" class="btn btn-secondary">Close</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("signInBtn").addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    try {
      const data = await signIn(email, password);
      if (data.user) {
        currentUser = data.user;
        updateAuthUI();
        document.body.removeChild(modal);
        loadPage("home");
      }
    } catch (error) {
      alert(error.message || "Login failed.");
    }
  });

  document.getElementById("signUpBtn").addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const username = document.getElementById("authUsername").value;
    try {
      const data = await signUp(email, password, username);
      if (data.user) {
        currentUser = data.user;
        updateAuthUI();
        document.body.removeChild(modal);
        loadPage("home");
        alert("Signup successful. Please confirm your email if required.");
      }
    } catch (error) {
      alert(error.message || "Signup failed.");
    }
  });

  document.getElementById("closeModal").addEventListener("click", () => {
    document.body.removeChild(modal);
  });
}

function loadPage(page) {
  const content = document.getElementById("content");
  switch (page) {
    case "home":
      content.innerHTML = `
        <div class="hero">
          <div class="hero-content">
            <h1>Welcome to Travel Buddy</h1>
            <p>Discover the magic of Incredible India - from the Taj Mahal to pristine beaches, plan your perfect Indian adventure.</p>
            <button class="btn" onclick="document.getElementById('tripForm').scrollIntoView({behavior: 'smooth'})">
              <i class="fas fa-plane"></i> Start Planning
            </button>
          </div>
        </div>
        <div class="section">
          <h2>Plan Your Dream Trip</h2>
          <p class="section-subtitle">Start by choosing your destination and dates. You must be logged in to save and manage your itinerary in My Trip.</p>
          <form id="tripForm" class="trip-form">
            <input type="text" id="destination" placeholder="Destination (City/Country)" required>
            <input type="date" id="startDate" required>
            <input type="date" id="endDate" required>
            <button type="submit" class="btn">
              <i class="fas fa-map-marker-alt"></i> Plan Trip
            </button>
          </form>
          <div class="login-prompt">
            <p>If you are not logged in, please <a href="#login">login</a> to save your trip.</p>
          </div>
        </div>
        <div class="section">
          <h2>Popular Destinations in India</h2>
          <div class="grid">
            <div class="card" data-destination="Agra">
              <img src="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1000&q=80" alt="Taj Mahal">
              <h3>Agra, Uttar Pradesh</h3>
              <p>Home to the iconic Taj Mahal and rich Mughal history.</p>
              <button class="btn" onclick="viewDestination('Agra')">Explore</button>
            </div>
            <div class="card" data-destination="Goa">
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80" alt="Goa">
              <h3>Goa</h3>
              <p>Beautiful beaches, coastal food, and vibrant seaside experiences.</p>
              <button class="btn" onclick="viewDestination('Goa')">Explore</button>
            </div>
            <div class="card" data-destination="Kerala">
              <img src="https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1000&q=80" alt="Kerala">
              <h3>Kerala</h3>
              <p>Backwaters, spices, and relaxing houseboat journeys.</p>
              <button class="btn" onclick="viewDestination('Kerala')">Explore</button>
            </div>
            <div class="card" data-destination="Jaipur">
              <img src="https://static.vecteezy.com/system/resources/previews/032/475/205/large_2x/hawa-mahal-the-temple-of-the-winds-jaipur-rajasthan-india-hawa-mahal-palace-palace-of-the-winds-in-jaipur-rajasthan-ai-generated-free-photo.jpg?auto=format&fit=crop&w=1000&q=80" alt="Jaipur">
              <h3>Jaipur, Rajasthan</h3>
              <p>Palaces, forts, and colorful bazaars make this city unforgettable.</p>
              <button class="btn" onclick="viewDestination('Jaipur')">Explore</button>
            </div>
            <div class="card" data-destination="Udaipur">
              <img src="https://www.travelplusstyle.com/wp-content/gallery/taj-lake-palace-udaipur/taj_lake_palace_hotel_1-b.jpg?auto=format&fit=crop&w=1000&q=80" alt="Udaipur">
              <h3>Udaipur, Rajasthan</h3>
              <p>Lakeside palaces and romantic views in the City of Lakes.</p>
              <button class="btn" onclick="viewDestination('Udaipur')">Explore</button>
            </div>
            <div class="card" data-destination="Rishikesh">
              <img src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=80" alt="Rishikesh">
              <h3>Rishikesh, Uttarakhand</h3>
              <p>Yoga, rafting, and riverside calm in the foothills of the Himalayas.</p>
              <button class="btn" onclick="viewDestination('Rishikesh')">Explore</button>
            </div>
            <div class="card" data-destination="Varanasi">
              <img src="https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1000&q=80" alt="Varanasi">
              <h3>Varanasi, Uttar Pradesh</h3>
              <p>Spiritual ghats, evening aarti, and timeless temple life.</p>
              <button class="btn" onclick="viewDestination('Varanasi')">Explore</button>
            </div>
            <div class="card" data-destination="Amritsar">
              <img src="https://wallpapers.com/images/featured/golden-temple-pictures-v03tlrki8zawoth9.jpg?auto=format&fit=crop&w=1000&q=80" alt="Amritsar">
              <h3>Amritsar, Punjab</h3>
              <p>Golden Temple serenity, Punjabi food, and rich heritage.</p>
              <button class="btn" onclick="viewDestination('Amritsar')">Explore</button>
            </div>
          </div>
        </div>
      `;
      document
        .getElementById("tripForm")
        .addEventListener("submit", generateItinerary);
      const destinationInput = document.getElementById("destination");
      if (window.selectedDestination) {
        destinationInput.value = window.selectedDestination;
        window.selectedDestination = null;
        destinationInput.focus();
      }
      break;
    case "explore":
      content.innerHTML = `
        <div class="section">
          <h1>Explore Incredible India</h1>
          <p>Discover the diverse beauty and rich culture of Incredible India</p>
          
          <div class="grid">
            <div class="card" data-destination="Agra">
              <img src="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1000&q=80" alt="Taj Mahal">
              <h3>Agra, Uttar Pradesh</h3>
              <p>Home to the iconic Taj Mahal, Agra Fort, and Fatehpur Sikri.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Agra')">Show on Map</button>
                <button class="btn" onclick="planTrip('Agra')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Goa">
              <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80" alt="Goa">
              <h3>Goa</h3>
              <p>Beautiful beaches and vibrant seaside culture for every traveler.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Goa')">Show on Map</button>
                <button class="btn" onclick="planTrip('Goa')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Kerala">
              <img src="https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1000&q=80" alt="Kerala">
              <h3>Kerala</h3>
              <p>Backwaters, spices, and relaxing Ayurvedic escapes.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Kerala')">Show on Map</button>
                <button class="btn" onclick="planTrip('Kerala')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Jaipur">
              <img src="https://static.vecteezy.com/system/resources/previews/032/475/205/large_2x/hawa-mahal-the-temple-of-the-winds-jaipur-rajasthan-india-hawa-mahal-palace-palace-of-the-winds-in-jaipur-rajasthan-ai-generated-free-photo.jpg?auto=format&fit=crop&w=1000&q=80" alt="Jaipur">
              <h3>Jaipur, Rajasthan</h3>
              <p>The Pink City with royal heritage, forts, and handicraft markets.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Jaipur')">Show on Map</button>
                <button class="btn" onclick="planTrip('Jaipur')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Udaipur">
              <img src="https://www.travelplusstyle.com/wp-content/gallery/taj-lake-palace-udaipur/taj_lake_palace_hotel_1-b.jpg?auto=format&fit=crop&w=1000&q=80" alt="Udaipur">
              <h3>Udaipur, Rajasthan</h3>
              <p>Romantic lake palaces and a serene royal atmosphere.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Udaipur')">Show on Map</button>
                <button class="btn" onclick="planTrip('Udaipur')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Rishikesh">
              <img src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=80" alt="Rishikesh">
              <h3>Rishikesh, Uttarakhand</h3>
              <p>Spiritual riverside retreats with yoga and rafting adventures.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Rishikesh')">Show on Map</button>
                <button class="btn" onclick="planTrip('Rishikesh')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Varanasi">
              <img src="https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?auto=format&fit=crop&w=1000&q=80" alt="Varanasi">
              <h3>Varanasi, Uttar Pradesh</h3>
              <p>Ancient temples, sacred ghats, and vibrant cultural rituals.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Varanasi')">Show on Map</button>
                <button class="btn" onclick="planTrip('Varanasi')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Amritsar">
              <img src="https://wallpapers.com/images/featured/golden-temple-pictures-v03tlrki8zawoth9.jpg?auto=format&fit=crop&w=1000&q=80" alt="Amritsar">
              <h3>Amritsar, Punjab</h3>
              <p>Visit the Golden Temple and taste the best Punjabi cuisine.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Amritsar')">Show on Map</button>
                <button class="btn" onclick="planTrip('Amritsar')">Plan Trip</button>
              </div>
            </div>
            <div class="card" data-destination="Darjeeling">
              <img src="https://images.unsplash.com/photo-1495562569060-2eec283d3391?auto=format&fit=crop&w=1000&q=80" alt="Darjeeling">
              <h3>Darjeeling, West Bengal</h3>
              <p>Tea gardens, mountain views, and the famous toy train ride.</p>
              <div class="card-actions">
                <button class="btn" onclick="openMapModal('Darjeeling')">Show on Map</button>
                <button class="btn" onclick="planTrip('Darjeeling')">Plan Trip</button>
              </div>
            </div>
          </div>
        </div>
        <div class="section" id="hotel-section">
          <h2>Luxury Hotels & Resorts in India</h2>
          <div class="grid">
            <div class="card">
              <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Taj Mahal Palace">
              <h3>Taj Mahal Palace, Mumbai</h3>
              <p>Iconic heritage hotel with colonial architecture and Arabian Sea views.</p>
              <p class="price">From ₹25,000/night</p>
              <button class="btn" onclick="bookHotel('Taj Mahal Palace, Mumbai')">Book Now</button>
            </div>
            <div class="card">
              <img src="https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Anantara">
              <h3>Anantara The Verda, Goa</h3>
              <p>Luxury beach resort with private villas and world-class spa.</p>
              <p class="price">From ₹18,000/night</p>
              <button class="btn" onclick="bookHotel('Anantara The Verda, Goa')">Book Now</button>
            </div>
            <div class="card">
              <img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="ITC Grand Chola">
              <h3>ITC Grand Chola, Chennai</h3>
              <p>Dravidian architecture with luxury amenities and fine dining.</p>
              <p class="price">From ₹15,000/night</p>
              <button class="btn" onclick="bookHotel('ITC Grand Chola, Chennai')">Book Now</button>
            </div>
          </div>
        </div>
      `;

      break;
    case "mytrip":
      content.innerHTML = `
        <div class="section">
          <h1><i class="fas fa-map-marked-alt"></i> My Travel Itinerary</h1>
          <p>Your personalized travel plans and memories</p>
          
          <div id="myTripMapContainer" class="map-container" style="display: none; margin-bottom: 2rem;"></div>
          
          <div id="itinerary" class="grid">
            <!-- Itinerary will be loaded here -->
          </div>
          <div id="no-trips" style="text-align: center; padding: 2rem;">
            <i class="fas fa-map-marked-alt" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
            <h3>No trips planned yet</h3>
            <p>Start by planning your dream trip on the home page!</p>
            <button class="btn" onclick="loadPage('home')">Plan a Trip</button>
          </div>

          <div class="section" id="tripStatsSection" style="display: none;">
            <h3><i class="fas fa-chart-bar"></i> Trip Statistics</h3>
            <div class="map-info-grid">
              <div class="info-card">
                <h4>Total Destinations</h4>
                <p id="statDestinations" style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">0</p>
              </div>
              <div class="info-card">
                <h4>Total Duration</h4>
                <p id="statDuration" style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">0 days</p>
              </div>
              <div class="info-card">
                <h4>Estimated Budget</h4>
                <p id="statBudget" style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">₹0</p>
              </div>
            </div>
          </div>
        </div>
      `;
      loadItinerary();
      break;
    case "emergency":
      content.innerHTML = `
        <div class="section">
          <h1><i class="fas fa-exclamation-circle"></i> Emergency & Safety Services</h1>
          <p>Quick access to emergency services and nearby help</p>
          
          <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a6f); padding: 2rem; border-radius: 12px; text-align: center; margin-bottom: 2rem; color: white;">
            <h2 style="color: white; margin-bottom: 1rem;">EMERGENCY SOS</h2>
            <button id="sosBtn" class="btn" style="background: white; color: #ff6b6b; font-size: 1.2rem; padding: 1rem 2rem; font-weight: bold; width: auto;">
              <i class="fas fa-phone"></i> ACTIVATE SOS
            </button>
            <p style="margin-top: 1rem; font-size: 0.9rem;">Press to send your location and emergency alert</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div class="card">
              <h3><i class="fas fa-hospital-alt" style="color: #4caf50;"></i> Hospitals</h3>
              <button class="btn" id="findHospitalsBtn" style="width: 100%;">
                <i class="fas fa-search"></i> Find Nearby
              </button>
              <ul id="hospitalList" class="attractions-list" style="margin-top: 1rem;"></ul>
            </div>

            <div class="card">
              <h3><i class="fas fa-pills" style="color: #2196f3;"></i> Pharmacies</h3>
              <button class="btn" id="findPharmaciesBtn" style="width: 100%;">
                <i class="fas fa-search"></i> Find Nearby
              </button>
              <ul id="pharmacyList" class="attractions-list" style="margin-top: 1rem;"></ul>
            </div>

            <div class="card">
              <h3><i class="fas fa-police" style="color: #ff9800;"></i> Police Station</h3>
              <button class="btn" id="findPoliceBtn" style="width: 100%;">
                <i class="fas fa-search"></i> Find Nearby
              </button>
              <ul id="policeList" class="attractions-list" style="margin-top: 1rem;"></ul>
            </div>
          </div>

          <div id="emergencyMap" class="map-container" style="display: none;"></div>

          <div class="section" id="emergencyInfo" style="background: rgba(76, 175, 80, 0.08); display: none;">
            <h3><i class="fas fa-info-circle"></i> Your Emergency Information</h3>
            <div id="emergencyDetails"></div>
          </div>

          <div class="section" style="background: #f0f4ff; border-left: 4px solid #2196f3;">
            <h3><i class="fas fa-phone"></i> Important Emergency Numbers</h3>
            <div style="display: grid; gap: 1rem;">
              <div>
                <strong>Police:</strong> 100 <button class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.9rem;" onclick="alert('In an emergency, call 100')">Call</button>
              </div>
              <div>
                <strong>Ambulance:</strong> 102 <button class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.9rem;" onclick="alert('In an emergency, call 102')">Call</button>
              </div>
              <div>
                <strong>Fire Brigade:</strong> 101 <button class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.9rem;" onclick="alert('In an emergency, call 101')">Call</button>
              </div>
              <div>
                <strong>Tourist Police Helpline:</strong> 1800-222-6363 <button class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.9rem;" onclick="alert('Tourist helpline: 1800-222-6363')">Call</button>
              </div>
            </div>
          </div>

          <div class="section" style="background: #fff3cd; border-left: 4px solid #ff9800;">
            <h3><i class="fas fa-shield-alt"></i> Safety Tips</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 0.5rem 0;"><i class="fas fa-check-circle" style="color: #4caf50;"></i> Always share your location with trusted contacts</li>
              <li style="padding: 0.5rem 0;"><i class="fas fa-check-circle" style="color: #4caf50;"></i> Keep your phone charged and accessible</li>
              <li style="padding: 0.5rem 0;"><i class="fas fa-check-circle" style="color: #4caf50;"></i> Memorize emergency contact numbers</li>
              <li style="padding: 0.5rem 0;"><i class="fas fa-check-circle" style="color: #4caf50;"></i> Stay aware of your surroundings</li>
              <li style="padding: 0.5rem 0;"><i class="fas fa-check-circle" style="color: #4caf50;"></i> Keep copies of important documents</li>
            </ul>
          </div>
        </div>
      `;

      document.getElementById("sosBtn").addEventListener("click", async () => {
        await activateEmergencySOS();
      });

      document
        .getElementById("findHospitalsBtn")
        .addEventListener("click", async () => {
          const hospitals = await findNearbyServices("hospital");
          const hospitalList = document.getElementById("hospitalList");
          hospitalList.innerHTML = hospitals
            .map(
              (h) => `
                <li>
                  <div>
                    <div class="attraction-name">${h.name}</div>
                  </div>
                  <span class="attraction-distance">${h.distance}</span>
                </li>`,
            )
            .join("");
        });

      document
        .getElementById("findPharmaciesBtn")
        .addEventListener("click", async () => {
          const pharmacies = await findNearbyServices("pharmacy");
          const pharmacyList = document.getElementById("pharmacyList");
          pharmacyList.innerHTML = pharmacies
            .map(
              (p) => `
                <li>
                  <div>
                    <div class="attraction-name">${p.name}</div>
                  </div>
                  <span class="attraction-distance">${p.distance}</span>
                </li>`,
            )
            .join("");
        });

      document
        .getElementById("findPoliceBtn")
        .addEventListener("click", async () => {
          const police = await findNearbyServices("police");
          const policeList = document.getElementById("policeList");
          policeList.innerHTML = police
            .map(
              (p) => `
                <li>
                  <div>
                    <div class="attraction-name">${p.name}</div>
                  </div>
                  <span class="attraction-distance">${p.distance}</span>
                </li>`,
            )
            .join("");
        });

      break;
    case "settings":
      if (!currentUser) {
        content.innerHTML = `
          <div class="section">
            <h1>Settings</h1>
            <p>Please log in to manage your account settings.</p>
            <button class="btn" onclick="loadPage('login')">Go to Login</button>
          </div>
        `;
        break;
      }

      const usernameValue = currentUser.user_metadata?.username || "";
      content.innerHTML = `
        <div class="section">
          <h1>Settings</h1>
          <p>Manage your Travel Buddy account and preferences.</p>
              <div class="settings-card">
                <h2>Account Information</h2>
                <p><strong>Email</strong>: ${currentUser.email}</p>
                <form id="settingsForm">
                  <label for="settingsUsername">Display name</label>
                  <input type="text" id="settingsUsername" value="${usernameValue}" placeholder="Enter your display name" />
                  <label for="notificationsToggle">Notifications</label>
                  <select id="notificationsToggle">
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>

                  <div class="settings-grid">
                    <div class="setting-item">
                      <label>Theme</label>
                      <div class="theme-options">
                        <label><input type="radio" name="theme" value="system" /> System</label>
                        <label><input type="radio" name="theme" value="light" /> Light</label>
                        <label><input type="radio" name="theme" value="dark" /> Dark</label>
                      </div>
                    </div>

                    <div class="setting-item">
                      <label for="mapStyleSelect">Map Style</label>
                      <select id="mapStyleSelect">
                        <option value="terrain">Terrain</option>
                      </select>
                    </div>
                  </div>

                  <button class="btn" type="submit">Save Settings</button>
                </form>
                <button class="btn btn-secondary" id="logoutButton">Logout</button>
              </div>
          <div class="settings-card">
            <h2>Feature Guide</h2>
            <p><strong>My Trip</strong>: View, cancel, and manage your saved trips.</p>
            <p><strong>Memories</strong>: Upload a photo first, then add or edit the description for each memory. You can delete memories anytime.</p>
            <p><strong>Itineraries</strong>: Store daily trip schedule items with date, time, activity, and notes.</p>
          </div>
        </div>
      `;

      // load saved app settings
      const savedAppSettings = JSON.parse(
        localStorage.getItem("appSettings") || "{}",
      );
      document.getElementById("notificationsToggle").value =
        savedAppSettings.notifications || "enabled";
      const savedTheme = savedAppSettings.theme || "system";
      const themeRadio = document.querySelector(
        `input[name="theme"][value="${savedTheme}"]`,
      );
      if (themeRadio) themeRadio.checked = true;
      document.getElementById("mapStyleSelect").value =
        savedAppSettings.mapStyle || "terrain";

      // apply theme immediately
      applyTheme(savedTheme);

      document
        .getElementById("settingsForm")
        .addEventListener("submit", async (event) => {
          event.preventDefault();
          const username = document
            .getElementById("settingsUsername")
            .value.trim();

          const selectedTheme =
            document.querySelector('input[name="theme"]:checked')?.value ||
            "system";
          const newAppSettings = {
            notifications: document.getElementById("notificationsToggle").value,
            theme: selectedTheme,
            mapStyle: document.getElementById("mapStyleSelect").value,
          };

          localStorage.setItem("appSettings", JSON.stringify(newAppSettings));

          // apply theme immediately
          applyTheme(newAppSettings.theme);

          const settingsUser = AuthService.getCurrentUser();
          if (settingsUser) {
            settingsUser.user_metadata = settingsUser.user_metadata || {};
            settingsUser.user_metadata.username = username;
            localStorage.setItem("user", JSON.stringify(settingsUser));
            currentUser = settingsUser;
            updateAuthUI();
            alert("Settings saved.");
          }
        });

      function applyTheme(theme) {
        if (theme === "dark") document.body.classList.add("dark-mode");
        else if (theme === "light") document.body.classList.remove("dark-mode");
        else document.body.classList.remove("dark-mode");
      }

      document
        .getElementById("logoutButton")
        .addEventListener("click", async (event) => {
          event.preventDefault();
          await signOut();
        });
      break;
    case "login":
      content.innerHTML = `
        <div class="section auth-page">
          <div class="auth-card auth-card-single">
            <h2>Welcome Back</h2>
            <p>Sign in to view your trips and memories.</p>
            <form id="authForm">
              <input type="email" id="authEmail" placeholder="Email" required />
              <input type="password" id="authPassword" placeholder="Password" required />
              <button class="btn" type="submit">Sign In</button>
            </form>
            <p class="auth-toggle-text">
              Don't have an account? <a href="#register">Register</a>
            </p>
          </div>
        </div>
      `;

      document
        .getElementById("authForm")
        .addEventListener("submit", async (event) => {
          event.preventDefault();
          const email = document.getElementById("authEmail").value;
          const password = document.getElementById("authPassword").value;

          try {
            const data = await signIn(email, password);
            if (data.user) {
              currentUser = data.user;
              updateAuthUI();
              loadPage("home");
            }
          } catch (error) {
            alert(error.message || "Login failed.");
          }
        });
      break;
    case "register":
      content.innerHTML = `
        <div class="section auth-page">
          <div class="auth-card auth-card-single">
            <h2>Create Your Account</h2>
            <p>Register to save your travel memories and trips.</p>
            <form id="authForm">
              <input type="email" id="authEmail" placeholder="Email" required />
              <input type="password" id="authPassword" placeholder="Password" required />
              <input type="text" id="authUsername" placeholder="Username" required />
              <button class="btn" type="submit">Sign Up</button>
            </form>
            <p class="auth-toggle-text">
              Already have an account? <a href="#login">Login</a>
            </p>
          </div>
        </div>
      `;

      document
        .getElementById("authForm")
        .addEventListener("submit", async (event) => {
          event.preventDefault();
          const email = document.getElementById("authEmail").value;
          const password = document.getElementById("authPassword").value;
          const usernameValue = document.getElementById("authUsername").value;

          try {
            const data = await signUp(email, password, usernameValue);
            if (data.user) {
              currentUser = data.user;
              updateAuthUI();
              loadPage("home");
              alert("Signup successful.");
            }
          } catch (error) {
            alert(error.message || "Signup failed.");
          }
        });
      break;
    case "memories":
      content.innerHTML = `
        <div class="section">
          <h1>Travel Memories</h1>
          <div class="memory-form memory-form-grid">
            <div class="memory-preview-box">
              <label for="memoryUpload">Upload your photo first</label>
              <input type="file" id="memoryUpload" accept="image/*" />
              <div id="memoryPreview" class="memory-preview">Select an image to preview</div>
              <button id="uploadBtn" class="btn hidden">Save Memory</button>
            </div>
          </div>
          <div id="memoriesList" class="memory-grid"></div>
        </div>
      `;
      document
        .getElementById("memoryUpload")
        .addEventListener("change", previewMemory);
      document
        .getElementById("uploadBtn")
        .addEventListener("click", uploadMemory);
      loadMemories();
      break;
    default:
      content.innerHTML = "<h1>Page not found</h1>";
  }

  const lazyImages = content.querySelectorAll("img");
  lazyImages.forEach((img) => {
    img.loading = "lazy";
    img.decoding = "async";
  });
}

async function viewDestination(destination) {
  window.selectedDestination = destination;
  loadPage("explore");
  setTimeout(() => {
    const destinationCard = document.querySelector(
      `[data-destination="${destination}"]`,
    );
    if (destinationCard) {
      destinationCard.scrollIntoView({ behavior: "smooth", block: "center" });
      destinationCard.classList.add("highlight-card");
      setTimeout(
        () => destinationCard.classList.remove("highlight-card"),
        1500,
      );
    }
  }, 120);
}

function planTrip(destination) {
  window.selectedDestination = destination;
  window.location.hash = "home";
}

function viewHotels(destination) {
  window.selectedDestination = destination;
  loadPage("explore");
  setTimeout(() => {
    const hotelSection = document.getElementById("hotel-section");
    if (hotelSection) {
      hotelSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 120);
}

function bookHotel(hotelName) {
  const savedHotels = JSON.parse(localStorage.getItem("bookedHotels") || "[]");
  savedHotels.push({ name: hotelName, date: new Date().toLocaleDateString() });
  localStorage.setItem("bookedHotels", JSON.stringify(savedHotels));
  alert(`${hotelName} has been added to your booked hotels.`);
}

async function generateItinerary(e) {
  e.preventDefault();
  const destination = document.getElementById("destination").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const theme = document.getElementById("theme")?.value || "adventure";
  const travelers = document.getElementById("travelers")?.value || "solo";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start < today || end < today) {
    alert("Cannot book a trip in the past. Please choose a future date.");
    return;
  }
  if (end < start) {
    alert("End date must be the same or after the start date.");
    return;
  }

  const itinerary = `
    <div class="section">
      <h2>Your ${theme.charAt(0).toUpperCase() + theme.slice(1)} Trip to ${destination}</h2>
      <p><i class="fas fa-calendar-alt"></i> ${start.toLocaleDateString()} - ${end.toLocaleDateString()} | <i class="fas fa-users"></i> ${travelers.charAt(0).toUpperCase() + travelers.slice(1)}</p>
      
      <div class="grid">
        <div class="card">
          <img src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Day 1">
          <h4>Day 1: Arrival & Exploration</h4>
          <p>Arrive at the airport, check into your hotel, and take a leisurely walk through the city center to get your bearings.</p>
          <ul>
            <li>Airport transfer</li>
            <li>Hotel check-in</li>
            <li>Evening city walk</li>
          </ul>
        </div>
        
        <div class="card">
          <img src="https://images.unsplash.com/photo-1540541338287-41700207dee6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Day 2">
          <h4>Day 2: Cultural Immersion</h4>
          <p>Visit local museums and historical sites to understand the rich heritage of the destination.</p>
          <ul>
            <li>Museum visit</li>
            <li>Historical landmarks</li>
            <li>Traditional cuisine tasting</li>
          </ul>
        </div>
        
        <div class="card">
          <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Day 3">
          <h4>Day 3: Adventure Day</h4>
          <p>Experience the natural beauty with outdoor activities tailored to your ${theme} preferences.</p>
          <ul>
            <li>Hiking or biking</li>
            <li>Scenic viewpoints</li>
            <li>Local adventure activity</li>
          </ul>
        </div>
        
        <div class="card">
          <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Day 4">
          <h4>Day 4: Relaxation & Shopping</h4>
          <p>Take it easy with spa treatments and explore local markets for souvenirs.</p>
          <ul>
            <li>Spa session</li>
            <li>Local markets</li>
            <li>Shopping for gifts</li>
          </ul>
        </div>
      </div>
      
      <div style="margin-top: 2rem; text-align: center;">
        <button class="btn" onclick="loadPage('memories')">
          <i class="fas fa-camera"></i> Add Travel Memories
        </button>
        <button class="btn" onclick="alert('Booking feature coming soon!')">
          <i class="fas fa-credit-card"></i> Book Accommodations
        </button>
      </div>
    </div>
  `;

  if (!currentUser) {
    alert("Please log in to save and manage your trip in My Trip.");
    window.location.hash = "login";
    return;
  }

  try {
    await TripsService.create(
      `Trip to ${destination}`,
      destination,
      startDate,
      endDate,
    );
    alert("Your trip has been saved. View it in My Trip.");
    loadPage("mytrip");
  } catch (error) {
    console.error("Unable to save trip:", error);
    alert("Unable to save trip. Please try again.");
  }
}

function calculateTripDurationInDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / dayMs) + 1);
}

function renderItineraryPreview(trips) {
  const previewEl = document.getElementById("itineraryPreviewPanel");
  if (!previewEl) return;

  if (!trips || trips.length === 0) {
    previewEl.style.display = "none";
    previewEl.innerHTML = "";
    return;
  }

  previewEl.style.display = "block";

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sortedTrips = [...trips].sort(
    (a, b) => new Date(a.start_date) - new Date(b.start_date),
  );
  const activeTrips = sortedTrips.filter((trip) => {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start <= now && end >= now;
  });
  const upcomingTrips = sortedTrips.filter(
    (trip) => new Date(trip.start_date) >= now,
  );
  const nextTrip = upcomingTrips[0] || sortedTrips[0];
  const nextTripInfo = getDestinationData(nextTrip.destination);
  const nextTripDuration = calculateTripDurationInDays(
    nextTrip.start_date,
    nextTrip.end_date,
  );

  const totalDuration = sortedTrips.reduce(
    (total, trip) =>
      total + calculateTripDurationInDays(trip.start_date, trip.end_date),
    0,
  );
  const averageDuration = Math.round(totalDuration / sortedTrips.length);
  const departureDate = new Date(nextTrip.start_date).toLocaleDateString();
  const nextTripLabel = activeTrips.length
    ? "On route"
    : upcomingTrips.length
      ? "Planning mode"
      : "Wrapped up";

  previewEl.innerHTML = `
    <section class="itinerary-preview-shell">
      <div class="itinerary-preview-header">
        <div>
          <p class="map-badge"><i class="fas fa-route"></i> Trip preview</p>
          <h2>Travel portfolio overview</h2>
          <p class="itinerary-preview-copy">A live snapshot of your saved journeys, departure timing, and journey length.</p>
        </div>
        <div class="itinerary-preview-score">${sortedTrips.length} saved trips</div>
      </div>

      <div class="itinerary-preview-stats">
        <div class="preview-stat-card">
          <span class="stat-label">Upcoming</span>
          <strong>${upcomingTrips.length}</strong>
          <p>planned departures</p>
        </div>
        <div class="preview-stat-card">
          <span class="stat-label">Active</span>
          <strong>${activeTrips.length}</strong>
          <p>currently traveling</p>
        </div>
        <div class="preview-stat-card">
          <span class="stat-label">Average length</span>
          <strong>${averageDuration} days</strong>
          <p>per itinerary</p>
        </div>
      </div>

      <div class="itinerary-focus-card">
        <div class="itinerary-focus-copy">
          <p class="preview-kicker">Next departure</p>
          <h3>${nextTripInfo.title || nextTrip.destination}</h3>
          <p>${departureDate} • ${nextTripDuration} days of planned travel</p>
        </div>
        <div class="itinerary-focus-meta">
          <span class="itinerary-chip ${activeTrips.length ? "active" : "planned"}">${nextTripLabel}</span>
          <span class="itinerary-chip">${Math.max(1, nextTripDuration)} days</span>
        </div>
      </div>
    </section>
  `;
}

async function loadItinerary() {
  const itineraryDiv = document.getElementById("itinerary");
  const noTripsDiv = document.getElementById("no-trips");

  try {
    const trips = await TripsService.getAll();

    // Ensure we only show trips belonging to the currently logged-in user
    let userTrips = Array.isArray(trips) ? trips : [];
    if (currentUser && userTrips.length) {
      userTrips = userTrips.filter(
        (t) => String(t.user_id) === String(currentUser.id),
      );
    }

    // renderItineraryPreview(userTrips); // Disabled - preview panel removed

    if (!userTrips || userTrips.length === 0) {
      noTripsDiv.style.display = "block";
      itineraryDiv.innerHTML = "";
      return;
    }

    noTripsDiv.style.display = "none";
    itineraryDiv.innerHTML = userTrips
      .map((trip) => {
        const destinationInfo = getDestinationData(trip.destination);
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);
        const duration = calculateTripDurationInDays(
          trip.start_date,
          trip.end_date,
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        const daysUntilTrip = Math.ceil(
          (startDate - today) / (24 * 60 * 60 * 1000),
        );

        const statusState =
          startDate <= today && endDate >= today
            ? "active"
            : daysUntilTrip <= 3 && daysUntilTrip >= 0
              ? "soon"
              : daysUntilTrip < 0
                ? "completed"
                : "upcoming";

        const statusLabel =
          statusState === "active"
            ? "Traveling now"
            : statusState === "soon"
              ? "Departing soon"
              : statusState === "completed"
                ? "Completed"
                : `${daysUntilTrip} days away`;

        return `
        <div class="card itinerary-card ${statusState}" data-trip-status="${statusState}">
          <div class="itinerary-card-topline">
            <span class="itinerary-duration-pill">${duration} days</span>
          </div>
          <img src="${destinationInfo.image}" alt="${destinationInfo.title}">
          <div class="itinerary-card-title-row">
            <div>
              <h4>${destinationInfo.title}</h4>
              <p class="itinerary-card-region">${destinationInfo.region || "Curated destination"}</p>
            </div>
          </div>
          <p class="itinerary-card-copy">${destinationInfo.description}</p>
          <p class="itinerary-card-date"><i class="fas fa-calendar-alt"></i> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
          <div class="card-actions">
            <button class="btn" onclick="viewTripDetails('${trip.id}')">View Details</button>
            <button class="btn btn-secondary" onclick="cancelTrip('${trip.id}')">Cancel Trip</button>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    noTripsDiv.style.display = "block";
    itineraryDiv.innerHTML = "";
    console.error("Unable to load trips:", error);
  }
}

async function viewTripDetails(tripId) {
  try {
    const trips = await TripsService.getAll();
    const userTrips = Array.isArray(trips)
      ? trips.filter((t) => String(t.user_id) === String(currentUser?.id))
      : [];
    const trip = userTrips.find((t) => t.id === tripId);
    if (trip) generateItineraryFromTrip(trip);
  } catch (error) {
    console.error("Unable to load trip details:", error);
    alert("Unable to load trip details. Please try again.");
  }
}

function renderTripItineraryList(itineraries) {
  const itineraryList = document.getElementById("itineraryList");
  if (!itineraryList) return;

  if (!itineraries || itineraries.length === 0) {
    itineraryList.innerHTML = `<p class="empty-state">No itinerary items added yet.</p>`;
    return;
  }

  itineraryList.innerHTML = itineraries
    .map(
      (item) => `
        <div class="card">
          <h4>${new Date(item.date).toLocaleDateString()} ${item.time ? ` • ${item.time}` : ""}</h4>
          <p><strong>${item.activity}</strong></p>
          <p>${item.description || "No additional notes."}</p>
        </div>
      `,
    )
    .join("");
}

async function generateItineraryFromTrip(trip) {
  const itineraryHtml = `
    <div class="section">
      <div class="trip-header">
        <div>
          <h2>Trip Details: ${trip.destination}</h2>
          <p><i class="fas fa-calendar-alt"></i> ${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}</p>
          <p><strong>Title</strong>: ${trip.title || "My Trip"}</p>
        </div>
        <div class="trip-header-actions">
          <button class="btn btn-secondary" onclick="cancelTrip('${trip.id}')">Cancel Trip</button>
        </div>
      </div>
      <div class="section">
        <h3>About this place</h3>
        <p class="place-description">${trip.destination} is a wonderful destination known for its rich culture, local cuisine, and memorable attractions. Whether you're interested in sightseeing, relaxing, or exploring local markets, this place offers something for every traveler. Pack comfortable shoes and an open mind — great experiences await!</p>
        <h3>Trip Summary</h3>
        <p>Review your saved trip details here. Use the button below to manage itinerary items when you are ready.</p>
        <button class="btn" id="showItineraryBtn">Show Itinerary Planner</button>
      </div>

      <div id="tripItinerarySection" class="hidden">
        <div class="section">
          <h3>Add Itinerary Item</h3>
          <form id="itineraryForm" class="itinerary-form">
            <input type="hidden" id="tripStartDate" value="${trip.start_date}" />
            <input type="hidden" id="tripEndDate" value="${trip.end_date}" />
            <input type="date" id="itineraryDate" required />
            <input type="time" id="itineraryTime" />
            <input type="text" id="itineraryActivity" placeholder="Activity (e.g. Museum visit)" required />
            <textarea id="itineraryDescription" rows="4" placeholder="Add notes for this itinerary item"></textarea>
            <button class="btn" type="submit">Add Itinerary Item</button>
          </form>
          <div id="itineraryList" class="memory-grid"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("content").innerHTML = itineraryHtml;

  document.getElementById("showItineraryBtn").addEventListener("click", () => {
    document.getElementById("tripItinerarySection").classList.toggle("hidden");
    document.getElementById("showItineraryBtn").textContent = document
      .getElementById("tripItinerarySection")
      .classList.contains("hidden")
      ? "Show Itinerary Planner"
      : "Hide Itinerary Planner";
  });

  document
    .getElementById("itineraryForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      await addItineraryItem(trip.id);
    });

  const existingItineraries = await ItinerariesService.getByTrip(trip.id);
  renderTripItineraryList(existingItineraries);
}

async function addItineraryItem(tripId) {
  const dateValue = document.getElementById("itineraryDate").value;
  const time = document.getElementById("itineraryTime").value;
  const activity = document.getElementById("itineraryActivity").value.trim();
  const description = document
    .getElementById("itineraryDescription")
    .value.trim();

  if (!dateValue || !activity) {
    alert("Please enter both a date and an activity for the itinerary item.");
    return;
  }

  const selectedDate = new Date(dateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    alert("Cannot add itinerary items for past dates.");
    return;
  }

  // Validate date is within trip start/end range (inclusive)
  const tripStartStr = document.getElementById("tripStartDate")?.value;
  const tripEndStr = document.getElementById("tripEndDate")?.value;
  if (tripStartStr && tripEndStr) {
    const tripStart = new Date(tripStartStr);
    const tripEnd = new Date(tripEndStr);
    // normalize time
    tripStart.setHours(0, 0, 0, 0);
    tripEnd.setHours(0, 0, 0, 0);
    if (selectedDate < tripStart || selectedDate > tripEnd) {
      alert("Itinerary date must fall between the trip start and end dates.");
      return;
    }
  }

  try {
    await ItinerariesService.create(
      tripId,
      dateValue,
      time,
      activity,
      description,
    );
    const updatedItineraries = await ItinerariesService.getByTrip(tripId);
    renderTripItineraryList(updatedItineraries);
    document.getElementById("itineraryForm").reset();
    alert("Itinerary item saved.");
  } catch (error) {
    console.error("Unable to save itinerary item:", error);
    alert("Unable to save itinerary item. Please try again.");
  }
}

function previewMemory() {
  const file = document.getElementById("memoryUpload").files[0];
  const preview = document.getElementById("memoryPreview");
  if (!file || !preview) return;

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div class="memory-preview-image-wrapper">
          <img src="${e.target.result}" alt="Memory preview" />
          <div class="memory-preview-overlay">
            <textarea id="memoryNote" rows="4" placeholder="Write the story behind this moment..."></textarea>
          </div>
        </div>
      `;
      currentMemoryPreview = e.target.result;
      document.getElementById("uploadBtn").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = `<p>Select an image file to preview.</p>`;
    currentMemoryPreview = null;
    document.getElementById("uploadBtn").classList.add("hidden");
  }
}

async function uploadMemory() {
  if (!currentUser) {
    alert("Please log in before saving memories.");
    return;
  }

  const file = document.getElementById("memoryUpload").files[0];
  const note = document.getElementById("memoryNote").value.trim();

  if (!file) {
    alert("Please select a memory photo to upload.");
    return;
  }
  if (!currentMemoryPreview) {
    alert("Please wait for the preview to load.");
    return;
  }

  const memoryData = {
    title: note ? note.split("\n")[0].slice(0, 40) : file.name,
    description: note,
    image_url: currentMemoryPreview,
  };

  try {
    await MemoriesService.create(
      null,
      memoryData.title,
      memoryData.description,
      memoryData.image_url,
    );
    document.getElementById("memoryUpload").value = "";
    document.getElementById("memoryNote").value = "";
    document.getElementById("memoryPreview").innerHTML =
      "Select an image to preview";
    currentMemoryPreview = null;
    loadMemories();
  } catch (error) {
    alert(error.message || "Unable to save memory.");
  }
}

async function loadMemories() {
  const memoriesDiv = document.getElementById("memoriesList");
  if (!memoriesDiv) return;

  try {
    const memories = await MemoriesService.getAll();
    let userMemories = Array.isArray(memories) ? memories : [];
    if (currentUser && userMemories.length) {
      userMemories = userMemories.filter(
        (m) => String(m.user_id) === String(currentUser.id),
      );
    }

    if (!userMemories || userMemories.length === 0) {
      memoriesDiv.innerHTML = `<p class="empty-state">No memories yet. Save your first travel moment above.</p>`;
      return;
    }

    memoriesDiv.innerHTML = userMemories
      .map(
        (memory) => `
        <div class="card memory-card">
          <div class="memory-card-inner">
            <div class="memory-card-image">
              <img src="${memory.image_url}" alt="${memory.title}" />
            </div>
            <div class="memory-card-content">
              <div class="memory-card-header">
                <h4>${memory.title}</h4>
                <p class="memory-date">${new Date(memory.created_at || memory.date).toLocaleDateString()}</p>
              </div>
              <textarea id="memoryText-${memory.id}" class="memory-description-textarea">${memory.description || ""}</textarea>
              <div class="memory-card-actions">
                <button class="btn btn-secondary" onclick="saveMemoryDescription('${memory.id}')">Save</button>
                <button class="btn btn-danger" onclick="deleteMemory('${memory.id}')">Delete</button>
              </div>
            </div>
          </div>
        </div>
      `,
      )
      .join("");
  } catch (error) {
    memoriesDiv.innerHTML = `<p class="empty-state">Unable to load memories. Please try again.</p>`;
  }
}

async function saveMemoryDescription(memoryId) {
  const textarea = document.getElementById(`memoryText-${memoryId}`);
  if (!textarea) return;
  const description = textarea.value.trim();

  try {
    await MemoriesService.update(memoryId, description);
    loadMemories();
    alert("Memory updated.");
  } catch (error) {
    console.error("Unable to update memory:", error);
    alert("Unable to update memory. Please try again.");
  }
}

async function deleteMemory(memoryId) {
  if (!confirm("Delete this memory?")) return;
  try {
    await MemoriesService.delete(memoryId);
    loadMemories();
  } catch (error) {
    console.error("Unable to delete memory:", error);
    alert("Unable to delete memory. Please try again.");
  }
}

async function cancelTrip(tripId) {
  if (!confirm("Are you sure you want to cancel this trip?")) return;
  try {
    await TripsService.delete(tripId);
    loadItinerary();
    alert("Trip cancelled successfully.");
  } catch (error) {
    console.error("Unable to cancel trip:", error);
    alert("Unable to cancel trip. Please try again.");
  }
}
