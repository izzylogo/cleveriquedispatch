// Initialize variables for map and routing
let map;
let routeControl;
let pickupMarker;
let deliveryMarker;

// Initialize the map when the page loads
window.addEventListener('load', function() {
    // Initialize the map after the loader is hidden
    setTimeout(initMap, 2000);
});

// Initialize Leaflet Map
function initMap() {
    // Create a new map centered on Nigeria
    map = L.map('map').setView([9.0820, 8.6753], 6);

    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(userLocation, 13);
                
                // Set the pickup location to the user's current location
                createPickupMarker(userLocation);
                
                // Reverse geocode to get address
                reverseGeocode(userLocation, (address) => {
                    document.getElementById('pickupLocation').value = address;
                });
            },
            () => {
                // Handle geolocation error
                console.log('Error: The Geolocation service failed.');
            }
        );
    }

    // Add event listeners for form inputs
    document.getElementById('packageType').addEventListener('change', calculatePrice);
    document.getElementById('packageWeight').addEventListener('input', calculatePrice);
    
    // Add form submission handler
    document.getElementById('deliveryForm').addEventListener('submit', handleFormSubmit);
    
    // Add event listeners for location inputs
    document.getElementById('pickupLocation').addEventListener('change', handlePickupLocationChange);
    document.getElementById('deliveryLocation').addEventListener('change', handleDeliveryLocationChange);
}

// Handle pickup location change
function handlePickupLocationChange() {
    const address = document.getElementById('pickupLocation').value;
    if (address.trim() === '') return;
    
    // Geocode the address to get coordinates
    geocodeAddress(address, (location) => {
        if (location) {
            createPickupMarker(location);
            calculateRoute();
        }
    });
}

// Handle delivery location change
function handleDeliveryLocationChange() {
    const address = document.getElementById('deliveryLocation').value;
    if (address.trim() === '') return;
    
    // Geocode the address to get coordinates
    geocodeAddress(address, (location) => {
        if (location) {
            createDeliveryMarker(location);
            calculateRoute();
        }
    });
}

// Geocode an address to get coordinates
function geocodeAddress(address, callback) {
    // Using Nominatim for geocoding (OpenStreetMap's geocoding service)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const location = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                callback(location);
            } else {
                alert('Address not found. Please try a different address.');
                callback(null);
            }
        })
        .catch(error => {
            console.error('Geocoding error:', error);
            callback(null);
        });
}

// Reverse geocode coordinates to get an address
function reverseGeocode(location, callback) {
    // Using Nominatim for reverse geocoding
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location[0]}&lon=${location[1]}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                callback(data.display_name);
            } else {
                callback('');
            }
        })
        .catch(error => {
            console.error('Reverse geocoding error:', error);
            callback('');
        });
}

// Create a marker for the pickup location
function createPickupMarker(location) {
    if (pickupMarker) {
        map.removeLayer(pickupMarker);
    }

    // Create a custom green icon
    const greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    pickupMarker = L.marker(location, {icon: greenIcon}).addTo(map);
    pickupMarker.bindPopup('Pickup Location').openPopup();
    
    // Center map on the marker
    map.setView(location, 13);
}

// Create a marker for the delivery location
function createDeliveryMarker(location) {
    if (deliveryMarker) {
        map.removeLayer(deliveryMarker);
    }

    // Create a custom red icon
    const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    deliveryMarker = L.marker(location, {icon: redIcon}).addTo(map);
    deliveryMarker.bindPopup('Delivery Location').openPopup();
}

// Calculate the route between pickup and delivery locations
function calculateRoute() {
    if (!pickupMarker || !deliveryMarker) {
        return;
    }

    // Remove existing route if any
    if (routeControl) {
        map.removeControl(routeControl);
    }

    // Create a new route
    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(pickupMarker.getLatLng().lat, pickupMarker.getLatLng().lng),
            L.latLng(deliveryMarker.getLatLng().lat, deliveryMarker.getLatLng().lng)
        ],
        routeWhileDragging: false,
        lineOptions: {
            styles: [{color: '#e60000', opacity: 0.7, weight: 5}]
        },
        createMarker: function() { return null; } // Don't create default markers
    }).addTo(map);

    // Get route details when route is calculated
    routeControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        
        // Update distance and duration
        const distance = (summary.totalDistance / 1000).toFixed(2); // Convert to km
        const duration = Math.round(summary.totalTime / 60); // Convert to minutes
        
        document.getElementById('distance').textContent = distance + ' km';
        document.getElementById('duration').textContent = duration + ' min';
        
        // Calculate price based on distance and package details
        calculatePrice();
    });
}

// Calculate the estimated price
function calculatePrice() {
    const distanceText = document.getElementById('distance').textContent;
    if (distanceText === '0 km') {
        document.getElementById('estimatedPrice').textContent = '₦0.00';
        return;
    }

    // Extract distance in kilometers
    const distanceValue = parseFloat(distanceText.replace(' km', ''));
    
    // Get package type and weight
    const packageType = document.getElementById('packageType').value;
    const packageWeight = parseFloat(document.getElementById('packageWeight').value) || 0;
    
    // Base price in Naira
    let basePrice = 2000.00;
    
    // Add price based on distance (e.g., ₦400 per km)
    let distancePrice = distanceValue * 400.0;
    
    // Add price based on package type
    let packageTypePrice = 0;
    switch (packageType) {
        case 'document':
            packageTypePrice = 800.00;
            break;
        case 'small':
            packageTypePrice = 2000.00;
            break;
        case 'medium':
            packageTypePrice = 4000.00;
            break;
        case 'large':
            packageTypePrice = 6000.00;
            break;
        case 'fragile':
            packageTypePrice = 8000.00;
            break;
    }
    
    // Add price based on weight (₦800 per kg)
    let weightPrice = packageWeight * 800.0;
    
    // Calculate total price
    let totalPrice = basePrice + distancePrice + packageTypePrice + weightPrice;
    
    // Update the price display with Naira symbol
    document.getElementById('estimatedPrice').textContent = '₦' + totalPrice.toFixed(2);
}

// Handle form submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validate that both locations are selected
    if (!pickupMarker || !deliveryMarker) {
        alert('Please select both pickup and delivery locations');
        return;
    }
    
    // Get form data
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
    
    // Here you would typically send this data to your server
    console.log('Delivery scheduled:', formData);
    
    // Show success message
    alert('Your delivery has been scheduled successfully!');
    
    // Reset form
    document.getElementById('deliveryForm').reset();
    
    // Clear map
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (deliveryMarker) map.removeLayer(deliveryMarker);
    if (routeControl) map.removeControl(routeControl);
    
    // Reset distance, duration and price
    document.getElementById('distance').textContent = '0 km';
    document.getElementById('duration').textContent = '0 min';
    document.getElementById('estimatedPrice').textContent = '₦0.00';
}

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.overlay');
    const hamburger = document.querySelector('.hamburger');
    
    menuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
    
    overlay.addEventListener('click', function() {
        navMenu.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    });
});