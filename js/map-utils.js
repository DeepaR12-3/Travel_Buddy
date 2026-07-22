// Map Utility Functions for Travel Buddy

class MapManager {
  constructor() {
    this.map = null;
    this.markers = [];
    this.polylines = [];
    this.routingControl = null;
    this.directionsContainerId = null;
  }

  setDirectionsContainer(id) {
    this.directionsContainerId = id;
  }

  // Initialize map in container
  initMap(containerId, lat = 20.5937, lng = 78.9629, zoom = 5) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return null;
    }

    // Clear existing map if any
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // If Leaflet left a container footprint behind, clear it for reuse
    if (container._leaflet_id) {
      container._leaflet_id = null;
      container.innerHTML = "";
    }

    this.map = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true,
      preferCanvas: true,
    }).setView([lat, lng], zoom);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      className: "map-tile-layer",
    }).addTo(this.map);

    // Handle resize after render
    setTimeout(() => {
      this.map.invalidateSize();
    }, 150);

    return this.map;
  }

  // Add marker to map
  addMarker(lat, lng, title = "", description = "", icon = "blue") {
    if (!this.map) {
      console.error("Map not initialized");
      return null;
    }

    const markerIcon = L.divIcon({
      className: "custom-map-marker-wrapper",
      html: `<div class="custom-map-marker ${icon}"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -20],
    });

    const marker = L.marker([lat, lng], {
      icon: markerIcon,
      riseOnHover: true,
    });

    const popupContent = `<div class="map-popup-content">
      <h4>${title}</h4>
      <p>${description}</p>
      <small>${lat.toFixed(4)}, ${lng.toFixed(4)}</small>
    </div>`;

    marker.bindPopup(popupContent);
    marker.addTo(this.map);

    this.markers.push(marker);
    return marker;
  }

  // Draw route between multiple points
  async drawRoute(waypoints) {
    if (!this.map || waypoints.length < 2) return null;

    this.clearRoute();

    const coordinates = waypoints.map((p) => [p.lat, p.lng]);
    const [start, end] = coordinates;
    const startLngLat = `${start[1]},${start[0]}`;
    const endLngLat = `${end[1]},${end[0]}`;
    let routeData = null;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLngLat};${endLngLat}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        routeData = data.routes[0];
      }
    } catch (error) {
      console.warn("OSRM routing fetch failed:", error);
    }

    let routeCoordinates = coordinates;
    this.lastRouteSteps = [];

    if (routeData && routeData.geometry && routeData.geometry.coordinates) {
      routeCoordinates = routeData.geometry.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ]);
      if (routeData.legs && routeData.legs.length > 0) {
        this.lastRouteSteps = routeData.legs[0].steps.map(
          (step) => step.maneuver.instruction,
        );
      }
    }

    const polyline = L.polyline(routeCoordinates, {
      color: "#d32f2f",
      weight: 6,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      smoothFactor: 1.2,
    });

    polyline.addTo(this.map);
    this.polylines.push(polyline);

    try {
      const bounds = polyline.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (e) {
      console.warn("Error fitting bounds:", e);
    }

    return routeData || polyline;
  }

  clearRoute() {
    if (this.routingControl) {
      this.routingControl.remove();
      this.routingControl = null;
    }
    this.polylines.forEach((line) => this.map.removeLayer(line));
    this.polylines = [];
  }

  // Calculate distance between two points (in km)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  }

  // Clear all markers
  clearMarkers() {
    if (!this.map) return;
    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers = [];
  }

  // Clear all polylines
  clearPolylines() {
    this.clearRoute();
  }

  // Fit all markers in view
  fitBounds() {
    if (this.markers.length === 0) return;

    const group = new L.featureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  // Get user's current location
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            reject(error);
          },
        );
      } else {
        reject(new Error("Geolocation not supported"));
      }
    });
  }

  // Add user location marker
  async addCurrentLocationMarker() {
    try {
      const location = await this.getCurrentLocation();
      const marker = this.addMarker(
        location.lat,
        location.lng,
        "Your Location",
        "You are here",
        "red",
      );

      // Center map on user
      this.map.setView([location.lat, location.lng], 13);
      return marker;
    } catch (error) {
      console.error("Error getting current location:", error);
      return null;
    }
  }
}

// Destination data with coordinates
const DESTINATION_COORDINATES = {
  agra: { lat: 27.1767, lng: 78.0081, title: "Agra, Uttar Pradesh" },
  goa: { lat: 15.2993, lng: 73.8243, title: "Goa" },
  kerala: { lat: 10.8505, lng: 76.2711, title: "Kerala" },
  jaipur: { lat: 26.9124, lng: 75.7873, title: "Jaipur, Rajasthan" },
  varanasi: { lat: 25.3282, lng: 82.9789, title: "Varanasi, Uttar Pradesh" },
  mumbai: { lat: 19.0761, lng: 72.8775, title: "Mumbai, Maharashtra" },
  udaipur: { lat: 24.5854, lng: 73.712, title: "Udaipur, Rajasthan" },
  rishikesh: { lat: 30.0885, lng: 78.2676, title: "Rishikesh, Uttarakhand" },
  amritsar: { lat: 31.634, lng: 74.8711, title: "Amritsar, Punjab" },
  darjeeling: { lat: 27.0393, lng: 88.2614, title: "Darjeeling, West Bengal" },
  delhi: { lat: 28.7041, lng: 77.1025, title: "Delhi" },
  bangalore: { lat: 12.9716, lng: 77.5946, title: "Bangalore" },
  kochi: { lat: 9.9312, lng: 76.2673, title: "Kochi, Kerala" },
  hyderabad: { lat: 17.3592, lng: 78.4594, title: "Hyderabad" },
};

// Get coordinates for destination
function getDestinationCoordinates(destination) {
  const normalized = destination?.toString().trim().toLowerCase();
  return (
    DESTINATION_COORDINATES[normalized] || {
      lat: 20.5937,
      lng: 78.9629,
      title: destination || "India",
    }
  );
}

// Nearby attractions (mock data)
const NEARBY_ATTRACTIONS = {
  agra: [
    {
      name: "Taj Mahal",
      lat: 27.1751,
      lng: 78.0421,
      type: "Monument",
      distance: "2.5 km",
    },
    {
      name: "Agra Fort",
      lat: 27.1809,
      lng: 78.0053,
      type: "Fort",
      distance: "1.2 km",
    },
    {
      name: "Mehtab Bagh",
      lat: 27.2067,
      lng: 78.0472,
      type: "Garden",
      distance: "3.8 km",
    },
    {
      name: "Itmad-ud-Daulah",
      lat: 27.1677,
      lng: 78.0421,
      type: "Tomb",
      distance: "2.9 km",
    },
    {
      name: "Jama Masjid",
      lat: 27.1754,
      lng: 78.0152,
      type: "Mosque",
      distance: "1.7 km",
    },
  ],
  jaipur: [
    {
      name: "Hawa Mahal",
      lat: 26.9245,
      lng: 75.8267,
      type: "Monument",
      distance: "1.5 km",
    },
    {
      name: "City Palace",
      lat: 26.9247,
      lng: 75.8245,
      type: "Palace",
      distance: "1.3 km",
    },
    {
      name: "Govind Dev Ji Temple",
      lat: 26.9268,
      lng: 75.8262,
      type: "Temple",
      distance: "1.6 km",
    },
    {
      name: "Jantar Mantar",
      lat: 26.9243,
      lng: 75.8251,
      type: "Observatory",
      distance: "1.4 km",
    },
    {
      name: "Jal Mahal",
      lat: 26.9489,
      lng: 75.8118,
      type: "Palace",
      distance: "4.3 km",
    },
  ],
  goa: [
    {
      name: "Baga Beach",
      lat: 15.5493,
      lng: 73.7383,
      type: "Beach",
      distance: "2.1 km",
    },
    {
      name: "Fort Aguada",
      lat: 15.4833,
      lng: 73.8,
      type: "Fort",
      distance: "5.2 km",
    },
    {
      name: "Basilica of Bom Jesus",
      lat: 15.4958,
      lng: 73.8854,
      type: "Church",
      distance: "8.5 km",
    },
    {
      name: "Anjuna Beach",
      lat: 15.5955,
      lng: 73.7449,
      type: "Beach",
      distance: "6.8 km",
    },
    {
      name: "Chapora Fort",
      lat: 15.5775,
      lng: 73.755,
      type: "Fort",
      distance: "5.6 km",
    },
  ],
  kerala: [
    {
      name: "Alleppey Backwaters",
      lat: 9.4822,
      lng: 76.3106,
      type: "Waterway",
      distance: "4.5 km",
    },
    {
      name: "Fort Kochi Beach",
      lat: 9.9646,
      lng: 76.2417,
      type: "Beach",
      distance: "2.8 km",
    },
    {
      name: "Munnar Tea Gardens",
      lat: 10.0889,
      lng: 77.0595,
      type: "Garden",
      distance: "12.1 km",
    },
    {
      name: "Athirapally Falls",
      lat: 10.2645,
      lng: 76.6157,
      type: "Waterfall",
      distance: "18.3 km",
    },
    {
      name: "Varkala Cliff",
      lat: 8.7376,
      lng: 76.7162,
      type: "Cliff",
      distance: "6.2 km",
    },
  ],
  mumbai: [
    {
      name: "Gateway of India",
      lat: 18.922,
      lng: 72.8347,
      type: "Landmark",
      distance: "3.1 km",
    },
    {
      name: "Marine Drive",
      lat: 18.943,
      lng: 72.8236,
      type: "Waterfront",
      distance: "4.2 km",
    },
    {
      name: "Chhatrapati Shivaji Terminus",
      lat: 18.9408,
      lng: 72.8356,
      type: "Heritage Station",
      distance: "3.5 km",
    },
    {
      name: "Juhu Beach",
      lat: 19.0981,
      lng: 72.8265,
      type: "Beach",
      distance: "15.7 km",
    },
    {
      name: "Elephanta Caves",
      lat: 18.9637,
      lng: 72.931,
      type: "Heritage Site",
      distance: "11.8 km",
    },
  ],
  udaipur: [
    {
      name: "City Palace",
      lat: 24.576,
      lng: 73.6835,
      type: "Palace",
      distance: "1.1 km",
    },
    {
      name: "Lake Pichola",
      lat: 24.5762,
      lng: 73.6816,
      type: "Lake",
      distance: "1.4 km",
    },
    {
      name: "Jagdish Temple",
      lat: 24.5752,
      lng: 73.6803,
      type: "Temple",
      distance: "1.3 km",
    },
    {
      name: "Saheliyon ki Bari",
      lat: 24.5908,
      lng: 73.6625,
      type: "Garden",
      distance: "2.9 km",
    },
    {
      name: "Fateh Sagar Lake",
      lat: 24.5971,
      lng: 73.6837,
      type: "Lake",
      distance: "2.5 km",
    },
  ],
  rishikesh: [
    {
      name: "Laxman Jhula",
      lat: 30.127,
      lng: 78.2911,
      type: "Bridge",
      distance: "3.3 km",
    },
    {
      name: "Ram Jhula",
      lat: 30.1295,
      lng: 78.2797,
      type: "Bridge",
      distance: "3.7 km",
    },
    {
      name: "Triveni Ghat",
      lat: 30.1098,
      lng: 78.2801,
      type: "Ghat",
      distance: "2.9 km",
    },
    {
      name: "Neelkanth Mahadev Temple",
      lat: 30.1901,
      lng: 78.3002,
      type: "Temple",
      distance: "12.0 km",
    },
    {
      name: "Vashishta Gufa",
      lat: 30.1119,
      lng: 78.2488,
      type: "Cave",
      distance: "5.4 km",
    },
  ],
  amritsar: [
    {
      name: "Golden Temple",
      lat: 31.62,
      lng: 74.8765,
      type: "Temple",
      distance: "1.2 km",
    },
    {
      name: "Jallianwala Bagh",
      lat: 31.6128,
      lng: 74.8703,
      type: "Memorial",
      distance: "0.8 km",
    },
    {
      name: "Wagah Border",
      lat: 31.6336,
      lng: 74.806,
      type: "Border Ceremony",
      distance: "25.4 km",
    },
    {
      name: "Durgiana Temple",
      lat: 31.6208,
      lng: 74.8762,
      type: "Temple",
      distance: "1.1 km",
    },
    {
      name: "Akal Takht",
      lat: 31.6192,
      lng: 74.8764,
      type: "Religious Site",
      distance: "1.0 km",
    },
  ],
  darjeeling: [
    {
      name: "Tiger Hill",
      lat: 27.0141,
      lng: 88.2481,
      type: "Viewpoint",
      distance: "11.6 km",
    },
    {
      name: "Batasia Loop",
      lat: 27.0015,
      lng: 88.2636,
      type: "Railway",
      distance: "4.4 km",
    },
    {
      name: "Ghoom Monastery",
      lat: 27.0091,
      lng: 88.2529,
      type: "Monastery",
      distance: "5.0 km",
    },
    {
      name: "Padmaja Naidu Himalayan Zoological Park",
      lat: 27.0058,
      lng: 88.262,
      type: "Zoo",
      distance: "3.9 km",
    },
    {
      name: "Tea Estate Tour",
      lat: 27.0374,
      lng: 88.2812,
      type: "Tour",
      distance: "6.2 km",
    },
  ],
  delhi: [
    {
      name: "India Gate",
      lat: 28.6129,
      lng: 77.2295,
      type: "Monument",
      distance: "3.7 km",
    },
    {
      name: "Qutub Minar",
      lat: 28.5244,
      lng: 77.1855,
      type: "Tower",
      distance: "20.2 km",
    },
    {
      name: "Lotus Temple",
      lat: 28.5535,
      lng: 77.2588,
      type: "Temple",
      distance: "12.0 km",
    },
    {
      name: "Red Fort",
      lat: 28.6562,
      lng: 77.241,
      type: "Historic Fort",
      distance: "4.9 km",
    },
    {
      name: "Humayun's Tomb",
      lat: 28.5933,
      lng: 77.2507,
      type: "Mausoleum",
      distance: "6.1 km",
    },
  ],
  bangalore: [
    {
      name: "Bangalore Palace",
      lat: 12.9987,
      lng: 77.5928,
      type: "Palace",
      distance: "4.0 km",
    },
    {
      name: "Lalbagh Botanical Garden",
      lat: 12.9507,
      lng: 77.5848,
      type: "Garden",
      distance: "6.6 km",
    },
    {
      name: "Cubbon Park",
      lat: 12.9763,
      lng: 77.5929,
      type: "Park",
      distance: "2.5 km",
    },
    {
      name: "ISKCON Temple",
      lat: 13.0067,
      lng: 77.553,
      type: "Temple",
      distance: "10.3 km",
    },
    {
      name: "Nandi Hills",
      lat: 13.37,
      lng: 77.6835,
      type: "Hill Station",
      distance: "58.0 km",
    },
  ],
  kochi: [
    {
      name: "Mattancherry Palace",
      lat: 9.967,
      lng: 76.2384,
      type: "Palace",
      distance: "12.5 km",
    },
    {
      name: "Jew Town",
      lat: 9.9714,
      lng: 76.2418,
      type: "Market",
      distance: "12.6 km",
    },
    {
      name: "Chinese Fishing Nets",
      lat: 9.9664,
      lng: 76.238,
      type: "Landmark",
      distance: "12.4 km",
    },
    {
      name: "Fort Kochi Beach",
      lat: 9.9675,
      lng: 76.2374,
      type: "Beach",
      distance: "12.3 km",
    },
    {
      name: "St. Francis Church",
      lat: 9.9686,
      lng: 76.2412,
      type: "Church",
      distance: "12.7 km",
    },
  ],
  hyderabad: [
    {
      name: "Charminar",
      lat: 17.3616,
      lng: 78.4747,
      type: "Monument",
      distance: "3.8 km",
    },
    {
      name: "Golconda Fort",
      lat: 17.3833,
      lng: 78.4011,
      type: "Fort",
      distance: "12.5 km",
    },
    {
      name: "Hussain Sagar Lake",
      lat: 17.4239,
      lng: 78.4738,
      type: "Lake",
      distance: "6.0 km",
    },
    {
      name: "Ramoji Film City",
      lat: 17.2545,
      lng: 78.4394,
      type: "Theme Park",
      distance: "40.2 km",
    },
    {
      name: "Salar Jung Museum",
      lat: 17.385,
      lng: 78.4028,
      type: "Museum",
      distance: "3.7 km",
    },
  ],
  varanasi: [
    {
      name: "Kashi Vishwanath Temple",
      lat: 25.3271,
      lng: 82.9808,
      type: "Temple",
      distance: "0.5 km",
    },
    {
      name: "Dashashwamedh Ghat",
      lat: 25.3281,
      lng: 82.9812,
      type: "Ghat",
      distance: "0.3 km",
    },
    {
      name: "Manikarnika Ghat",
      lat: 25.3268,
      lng: 82.9815,
      type: "Ghat",
      distance: "0.6 km",
    },
    {
      name: "Assi Ghat",
      lat: 25.2839,
      lng: 83.0081,
      type: "Ghat",
      distance: "2.2 km",
    },
    {
      name: "Sarnath",
      lat: 25.4294,
      lng: 83.0061,
      type: "Heritage Site",
      distance: "10.1 km",
    },
  ],
};

// Get nearby attractions
function getNearbyAttractions(destination) {
  const normalized = destination?.toString().trim().toLowerCase();
  if (NEARBY_ATTRACTIONS[normalized]) return NEARBY_ATTRACTIONS[normalized];

  // Fallback: generate a few mock attractions around the destination coordinates
  const base = getDestinationCoordinates(destination || "");
  const offsets = [
    [0.02, 0.02],
    [0.018, -0.015],
    [-0.02, 0.012],
    [-0.015, -0.02],
  ];

  function calcDist(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  }

  const generated = offsets.map((off, idx) => {
    const lat = base.lat + off[0];
    const lng = base.lng + off[1];
    const distance = calcDist(base.lat, base.lng, lat, lng) + " km";
    return {
      name: `Attraction ${idx + 1}`,
      lat: lat,
      lng: lng,
      type: "Point of Interest",
      distance: distance,
    };
  });

  return generated;
}
