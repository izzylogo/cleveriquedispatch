// OpenLayers-based implementation: GPS pickup, input delivery, OSRM routing
let map;
let markerLayer;
let routeLayer;
let pickupFeature;
let deliveryFeature;
let routeFeature;

window.addEventListener('load', function() {
  setTimeout(initMap, 2000);
});

function initMap() {
  // Initialize OpenLayers map centered on Nigeria
  map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      })
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([8.6753, 9.0820]),
      zoom: 6
    })
  });

  markerLayer = new ol.layer.Vector({ source: new ol.source.Vector() });
  routeLayer = new ol.layer.Vector({ source: new ol.source.Vector() });
  map.addLayer(routeLayer);
  map.addLayer(markerLayer);

  // Try to get user's current location for pickup
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const userLonLat = [lon, lat];
        map.getView().setCenter(ol.proj.fromLonLat(userLonLat));
        map.getView().setZoom(13);
        createPickupMarker(userLonLat);
        reverseGeocode([lat, lon], (address) => {
          document.getElementById('pickupLocation').value = address || 'Your current location';
        });
      },
      () => {
        // Fallback to Lagos, Nigeria when GPS is unavailable
        const fallbackLonLat = [3.3792, 6.5244]; // lon, lat
        map.getView().setCenter(ol.proj.fromLonLat(fallbackLonLat));
        map.getView().setZoom(12);
        createPickupMarker(fallbackLonLat);
        document.getElementById('pickupLocation').value = 'Lagos, Nigeria';
      }
    );
  }

  document.getElementById('packageType').addEventListener('change', calculatePrice);
  document.getElementById('packageWeight').addEventListener('input', calculatePrice);
  document.getElementById('deliveryForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('deliveryLocation').addEventListener('change', handleDeliveryLocationChange);
}

function handleDeliveryLocationChange() {
  const address = document.getElementById('deliveryLocation').value;
  if (address.trim() === '') return;
  geocodeAddress(address, (location) => {
    if (location) {
      createDeliveryMarker(location);
      calculateRoute();
    }
  });
}

function geocodeAddress(address, callback) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
    .then((response) => response.json())
    .then((data) => {
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        callback([lon, lat]); // lon,lat for map coordinates
      } else {
        alert('Address not found. Please try a different address.');
        callback(null);
      }
    })
    .catch((error) => {
      console.error('Geocoding error:', error);
      callback(null);
    });
}

function reverseGeocode(locationLatLon, callback) {
  const [lat, lon] = locationLatLon;
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    .then((response) => response.json())
    .then((data) => {
      if (data && data.display_name) {
        callback(data.display_name);
      } else {
        callback('');
      }
    })
    .catch((error) => {
      console.error('Reverse geocoding error:', error);
      callback('');
    });
}

function createPickupMarker(lonLat) {
  if (pickupFeature) {
    markerLayer.getSource().removeFeature(pickupFeature);
  }
  pickupFeature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat(lonLat))
  });
  pickupFeature.setStyle(
    new ol.style.Style({
      image: new ol.style.Icon({
        src: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        scale: 0.5,
        anchor: [0.5, 1]
      })
    })
  );
  markerLayer.getSource().addFeature(pickupFeature);
}

function createDeliveryMarker(lonLat) {
  if (deliveryFeature) {
    markerLayer.getSource().removeFeature(deliveryFeature);
  }
  deliveryFeature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat(lonLat))
  });
  deliveryFeature.setStyle(
    new ol.style.Style({
      image: new ol.style.Icon({
        src: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        scale: 0.5,
        anchor: [0.5, 1]
      })
    })
  );
  markerLayer.getSource().addFeature(deliveryFeature);
}

function calculateRoute() {
  if (!pickupFeature || !deliveryFeature) return;

  // Get coordinates (lon,lat)
  const pickupCoord = ol.proj.toLonLat(pickupFeature.getGeometry().getCoordinates());
  const deliveryCoord = ol.proj.toLonLat(deliveryFeature.getGeometry().getCoordinates());

  // Request route from OSRM
  const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoord[0]},${pickupCoord[1]};${deliveryCoord[0]},${deliveryCoord[1]}?overview=full&geometries=geojson`;
  fetch(url)
    .then((resp) => resp.json())
    .then((data) => {
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates; // [lon,lat]
        const projected = coords.map((c) => ol.proj.fromLonLat(c));

        // Clear previous route
        if (routeFeature) {
          routeLayer.getSource().removeFeature(routeFeature);
        }

        routeFeature = new ol.Feature({
          geometry: new ol.geom.LineString(projected)
        });
        routeFeature.setStyle(
          new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#e60000', width: 5 })
          })
        );
        routeLayer.getSource().addFeature(routeFeature);

        // Fit map to route
        const extent = routeFeature.getGeometry().getExtent();
        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 500 });

        // Update distance and duration
        const distanceKm = (route.distance / 1000).toFixed(2);
        const durationMin = Math.round(route.duration / 60);
        document.getElementById('distance').textContent = `${distanceKm} km`;
        document.getElementById('duration').textContent = `${durationMin} min`;

        calculatePrice();
      }
    })
    .catch((err) => console.error('Routing error:', err));
}

function calculatePrice() {
  const distanceText = document.getElementById('distance').textContent;
  if (!distanceText || distanceText === '0 km') {
    document.getElementById('estimatedPrice').textContent = '₦0.00';
    return;
  }
  const distanceValue = parseFloat(distanceText.replace(' km', ''));
  const packageType = document.getElementById('packageType').value;
  const packageWeight = parseFloat(document.getElementById('packageWeight').value) || 0;
  let basePrice = 2000.0;
  let distancePrice = distanceValue * 400.0;
  let packageTypePrice = 0;
  switch (packageType) {
    case 'document':
      packageTypePrice = 800.0;
      break;
    case 'small':
      packageTypePrice = 2000.0;
      break;
    case 'medium':
      packageTypePrice = 4000.0;
      break;
    case 'large':
      packageTypePrice = 6000.0;
      break;
    case 'fragile':
      packageTypePrice = 8000.0;
      break;
  }
  let weightPrice = packageWeight * 800.0;
  let totalPrice = basePrice + distancePrice + packageTypePrice + weightPrice;
  document.getElementById('estimatedPrice').textContent = `₦${totalPrice.toFixed(2)}`;
}

function handleFormSubmit(event) {
  event.preventDefault();
  if (!pickupFeature || !deliveryFeature) {
    alert('Please ensure your pickup location is detected and delivery address is set.');
    return;
  }
  const formData = {
    pickupLocation: document.getElementById('pickupLocation').value,
    deliveryLocation: document.getElementById('deliveryLocation').value,
    packageType: document.getElementById('packageType').value,
    packageWeight: document.getElementById('packageWeight').value,
    deliveryDate: document.getElementById('deliveryDate').value,
    deliveryTime: document.getElementById('deliveryTime').value,
    specialInstructions: document.getElementById('specialInstructions').value,
    estimatedPrice: document.getElementById('estimatedPrice').textContent,
    distance: document.getElementById('distance').textContent,
    duration: document.getElementById('duration').textContent
  };
  console.log('Delivery scheduled:', formData);
  alert('Your delivery has been scheduled successfully!');
  document.getElementById('deliveryForm').reset();

  // Preserve pickup; clear delivery and route
  if (deliveryFeature) markerLayer.getSource().removeFeature(deliveryFeature);
  if (routeFeature) routeLayer.getSource().removeFeature(routeFeature);
  document.getElementById('distance').textContent = '0 km';
  document.getElementById('duration').textContent = '0 min';
  document.getElementById('estimatedPrice').textContent = '₦0.00';
}

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');
    const overlay = document.querySelector('.overlay');
    const navLinks = document.querySelectorAll('.nav-links li a');

    // Toggle mobile menu
    function toggleMenu() {
        nav.classList.toggle('active');
        hamburger.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : 'auto';
    }

    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close menu when clicking on a nav link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            nav.classList.remove('active');
            hamburger.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });

    // Close menu on window resize if above mobile breakpoint
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            nav.classList.remove('active');
            hamburger.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });

  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const overlay = document.querySelector('.overlay');
  const hamburger = document.querySelector('.hamburger');
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
      overlay.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', function() {
      navMenu.classList.remove('active');
      overlay.classList.remove('active');
      hamburger.classList.remove('active');
    });
  }
});