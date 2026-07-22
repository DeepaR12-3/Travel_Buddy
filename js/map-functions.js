// Map Integration Functions for Travel Buddy

let exploreMapManager = null;

function showDestinationOnMap(destination, containerId) {
  if (!exploreMapManager) {
    exploreMapManager = new MapManager();
    exploreMapManager.initMap(containerId);
  }

  const coords = getDestinationCoordinates(destination);
  exploreMapManager.clearMarkers();
  exploreMapManager.clearPolylines();

  const attractions = getNearbyAttractions(destination);

  // Add destination marker
  exploreMapManager.addMarker(
    coords.lat,
    coords.lng,
    coords.title,
    "Popular destination in India",
    "green",
  );

  // Add nearby attractions
  attractions.forEach((attr) => {
    exploreMapManager.addMarker(
      attr.lat,
      attr.lng,
      attr.name,
      `${attr.type} - ${attr.distance}`,
      "blue",
    );
  });

  const destinationBadge = document.getElementById("selectedDestinationBadge");
  const attractionCount = document.getElementById("selectedAttractionCount");
  const exploreStatus = document.getElementById("exploreMapStatus");

  document.querySelectorAll(".card[data-destination]").forEach((card) => {
    const cardDestination = card
      .getAttribute("data-destination")
      ?.toLowerCase();
    const isActive = cardDestination === destination.toLowerCase();
    card.classList.toggle("is-active", isActive);
  });

  if (destinationBadge) {
    destinationBadge.textContent = coords.title;
  }
  if (attractionCount) {
    attractionCount.textContent = `${attractions.length} nearby`;
  }
  if (exploreStatus) {
    exploreStatus.textContent = `${coords.title} is active with ${attractions.length} curated attractions. Open the route planner to build an itinerary.`;
  }

  // Center and zoom
  exploreMapManager.map.setView([coords.lat, coords.lng], 11);
  exploreMapManager.fitBounds();

  setTimeout(() => {
    exploreMapManager.map.invalidateSize();
  }, 150);
}

// Enhanced Emergency feature with location
async function activateEmergencySOS() {
  try {
    const location = await new MapManager().getCurrentLocation();

    // Create emergency alert with location
    const emergencyData = {
      timestamp: new Date().toISOString(),
      location: location,
      userEmail: currentUser ? currentUser.email : "Unknown",
      message: "SOS Alert from Travel Buddy App",
    };

    console.log("Emergency SOS Activated:", emergencyData);

    // In a real app, you would send this to an emergency service API
    alert(
      `SOS activated!\nYour location: ${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°\nEmergency services have been notified.`,
    );

    // Log the SOS event
    localStorage.setItem("lastSOSActivation", JSON.stringify(emergencyData));
  } catch (error) {
    console.error("Unable to get location for SOS:", error);
    alert(
      "SOS activated! Unable to obtain location. Please provide your location to emergency services manually.",
    );
  }
}

// Calculate trip statistics
function calculateTripStatistics(waypoints) {
  if (waypoints.length < 2) return null;

  let totalDistance = 0;
  let estimatedTime = 0; // in hours

  const mapMgr = new MapManager();

  for (let i = 0; i < waypoints.length - 1; i++) {
    const distance = parseFloat(
      mapMgr.calculateDistance(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng,
      ),
    );
    totalDistance += distance;
    // Assume average 60 km/hour travel speed
    estimatedTime += distance / 60;
  }

  return {
    totalDistance: totalDistance.toFixed(2) + " km",
    estimatedTime: Math.ceil(estimatedTime) + " hours",
    waypoints: waypoints.length,
  };
}

// Export trip as JSON
function exportTripData(tripData) {
  const dataStr = JSON.stringify(tripData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trip-${new Date().getTime()}.json`;
  link.click();
}

// Share trip location (social sharing)
function shareTripLocation(destination, lat, lng) {
  const message = `I'm visiting ${destination} (${lat.toFixed(4)}°, ${lng.toFixed(4)}°) with Travel Buddy! 🌍🎒`;
  const encodedMessage = encodeURIComponent(message);
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

  // For now, show a simple share prompt
  alert(
    `Share this trip:\n\nDestination: ${destination}\nLocation: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°\n\nGoogle Maps: ${mapsLink}`,
  );
}

// Nearby services finder (police, hospitals, pharmacies)
async function findNearbyServices(serviceType = "hospital") {
  try {
    const userLocation = await new MapManager().getCurrentLocation();

    // This is a mock implementation
    // In a real app, you'd use Google Places API or similar
    const services = {
      hospital: [
        {
          name: "City Medical Center",
          distance: "0.5 km",
          lat: userLocation.lat + 0.005,
          lng: userLocation.lng + 0.005,
        },
        {
          name: "Emergency Care Clinic",
          distance: "1.2 km",
          lat: userLocation.lat - 0.003,
          lng: userLocation.lng + 0.008,
        },
      ],
      police: [
        {
          name: "City Police Station",
          distance: "0.8 km",
          lat: userLocation.lat + 0.002,
          lng: userLocation.lng - 0.007,
        },
      ],
      pharmacy: [
        {
          name: "24/7 Pharmacy",
          distance: "0.3 km",
          lat: userLocation.lat - 0.004,
          lng: userLocation.lng + 0.003,
        },
        {
          name: "MediCare Pharmacy",
          distance: "0.9 km",
          lat: userLocation.lat + 0.006,
          lng: userLocation.lng - 0.002,
        },
      ],
    };

    return services[serviceType] || services.hospital;
  } catch (error) {
    console.error("Unable to find nearby services:", error);
    return [];
  }
}

// Get weather data placeholder (would integrate with API)
async function getDestinationWeather(destination) {
  // Mock weather data
  const weatherData = {
    agra: {
      temperature: "32°C",
      condition: "Sunny",
      humidity: "45%",
      bestTime: "October to March",
    },
    goa: {
      temperature: "28°C",
      condition: "Partly Cloudy",
      humidity: "80%",
      bestTime: "November to February",
    },
    kerala: {
      temperature: "26°C",
      condition: "Monsoon",
      humidity: "85%",
      bestTime: "August to October",
    },
    jaipur: {
      temperature: "35°C",
      condition: "Hot & Dry",
      humidity: "35%",
      bestTime: "November to February",
    },
  };

  const key = destination.toString().trim().toLowerCase();
  return weatherData[key] || { temperature: "N/A", condition: "N/A" };
}

// Budget calculator for trip
function calculateTripBudget(destination, days, travelersCount) {
  const dailyBudget = {
    agra: 2000,
    goa: 2500,
    kerala: 2200,
    jaipur: 1800,
    varanasi: 1500,
    mumbai: 3000,
    udaipur: 2400,
    rishikesh: 1600,
    amritsar: 1700,
  };

  const key = destination.toString().trim().toLowerCase();
  const perPersonPerDay = dailyBudget[key] || 2000;
  const estimatedBudget = perPersonPerDay * days * travelersCount;

  return {
    perPersonPerDay: perPersonPerDay,
    estimatedBudget: estimatedBudget,
    accommodation: estimatedBudget * 0.35,
    food: estimatedBudget * 0.3,
    activities: estimatedBudget * 0.25,
    transport: estimatedBudget * 0.1,
  };
}

// Get travel recommendations based on preferences
function getTravelRecommendations(destination, theme) {
  const recommendations = {
    agra: {
      adventure: [
        "Taj Mahal sunrise tour",
        "Hot air balloon ride",
        "Agra Fort exploration",
      ],
      food: ["Petha tasting", "Mughlai cuisine", "Street food tour"],
      relaxation: ["Spa treatments", "Riverside walks", "Garden visits"],
      heritage: ["Taj Mahal study", "Fatehpur Sikri", "Akbar Museum"],
    },
    goa: {
      adventure: ["Water sports", "Scuba diving", "Trekking"],
      food: ["Fish curry", "Prawn dishes", "Feni tasting"],
      relaxation: ["Beach lounging", "Spa therapy", "Yoga sessions"],
      beach: ["Baga Beach", "Anjuna Beach", "Calangute Beach"],
    },
  };

  const key = destination.toString().trim().toLowerCase();
  return (
    recommendations[key] || {
      default: ["Local exploration", "Dining experience", "Rest day"],
    }
  );
}
