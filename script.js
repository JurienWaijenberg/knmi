// Hamburger menu functionality
const hamburgerMenu = document.getElementById('hamburgerMenu');
const dropdownMenu = document.getElementById('dropdownMenu');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    dropdownMenu.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}

hamburgerMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleSidebar();
});

// Close sidebar when clicking overlay
sidebarOverlay.addEventListener('click', function() {
    toggleSidebar();
});

// Close sidebar when clicking outside
document.addEventListener('click', function(e) {
    if (!hamburgerMenu.contains(e.target) && !dropdownMenu.contains(e.target) && dropdownMenu.classList.contains('active')) {
        toggleSidebar();
    }
});

// Store all cities data
let allCitiesData = [];
let map = null;
let markers = [];

// Function to render cities data
function renderCities(citiesData) {
    const dataContainer = document.getElementById('data');
    
    if (!citiesData || citiesData.length === 0) {
        return;
    }

    let html = '';
    
    citiesData.forEach(city => {

        if (city.locations && city.locations.length > 0) {
            city.locations.forEach(location => {

                if (location.measurements && location.measurements.length > 0) {
                    location.measurements.forEach(measurement => {
                        const startDate = new Date(measurement.start_date).toLocaleDateString();
                        const endDate = new Date(measurement.end_date).toLocaleDateString();
                        const startTime = new Date(measurement.start_time).toLocaleTimeString();
                        const endTime = new Date(measurement.end_time).toLocaleTimeString();
                    });
                } else {
                }
            });
        } else {
            html += '<div class="location-details">No locations available</div>';
        }
    });

    dataContainer.innerHTML = html;
}

// Function to populate city dropdown
function populateCityDropdown(citiesData) {
    const cityDropdown = document.getElementById('cityDropdown');
    
    // Add each city as an option
    citiesData.forEach(city => {
        const option = document.createElement('option');
        option.value = city.name;
        option.textContent = city.name;
        cityDropdown.appendChild(option);
    });
    
    // Set Kumasi as default selection
    cityDropdown.value = 'Kumasi';
}

// Function to initialize or update the map
function updateMap(selectedCity) {
    const mapContainer = document.getElementById('mapContainer');
    
    if (!selectedCity || selectedCity === '') {
        // Hide map if no city is selected
        mapContainer.classList.remove('active');
        if (map) {
            map.remove();
            map = null;
            markers = [];
        }
        return;
    }
    
    // Find the selected city data
    const cityData = allCitiesData.find(city => city.name === selectedCity);
    
    if (!cityData || !cityData.locations || cityData.locations.length === 0) {
        mapContainer.classList.remove('active');
        if (map) {
            map.remove();
            map = null;
            markers = [];
        }
        return;
    }
    
    // Show map container
    mapContainer.classList.add('active');
    
    // Remove existing map if it exists
    if (map) {
        map.remove();
        markers = [];
    }
    
    // Wait a moment for the container to be rendered, then initialize map
    setTimeout(() => {
        // Initialize map
        map = L.map('map');
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Create bounds to fit all markers
        const bounds = [];
        
        // Add markers for each location
        cityData.locations.forEach(location => {
            const lat = parseFloat(location.latitude);
            const lng = parseFloat(location.longitude);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                // Create popup content
                let popupContent = `<strong>${location.name}</strong><br>`;
                popupContent += `Coordinates: ${lat}, ${lng}<br>`;
                if (location.description) {
                    popupContent += `<em>${location.description}</em><br>`;
                }
                
                // Add measurement info if available
                if (location.measurements && location.measurements.length > 0) {
                    popupContent += `<br><strong>Measurements:</strong><br>`;
                    location.measurements.forEach(measurement => {
                        popupContent += `NO₂: ${measurement.no2_concentration} μg/m³ (Tube: ${measurement.tube_id})<br>`;
                    });
                }
                
                // Create marker with custom icon (teal color to match design)
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: #5ac8b3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map);
                
                marker.bindPopup(popupContent);
                markers.push(marker);
                bounds.push([lat, lng]);
            }
        });
        
        // Fit map to show all markers
        if (bounds.length > 0) {
            if (bounds.length === 1) {
                // If only one marker, center on it with a reasonable zoom
                map.setView(bounds[0], 13);
            } else {
                // Fit bounds to show all markers
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, 100);
}

// Function to filter cities by selected city
function filterCitiesBySelection(selectedCity) {
    const allCities = document.querySelectorAll('.city');
    
    // Show only selected city
    allCities.forEach(city => {
        const cityName = city.getAttribute('data-city-name');
        if (cityName === selectedCity) {
            city.classList.remove('hidden');
        } else {
            city.classList.add('hidden');
        }
    });
    
    // Update map
    updateMap(selectedCity);
}

// City dropdown change event
const cityDropdown = document.getElementById('cityDropdown');
cityDropdown.addEventListener('change', function() {
    filterCitiesBySelection(this.value);
});

// data fetch
fetch('https://knmi.waijenbergmedia.nl/api/v1/cities?with=locations.measurements')
    .then(response => response.json())
    .then(data => {
        console.log(data);
        
        if (!data.data || data.data.length === 0) {
            const dataContainer = document.getElementById('data');
            dataContainer.innerHTML = '<div class="error">No data available</div>';
            return;
        }
        
        // Store all cities data
        allCitiesData = data.data;
        
        // Populate dropdown
        populateCityDropdown(allCitiesData);
        
        // Render all cities initially
        renderCities(allCitiesData);
        
        // Filter and show Kumasi by default
        filterCitiesBySelection('Kumasi');
    })
    .catch(error => {
        console.error('Error:', error);
        const dataContainer = document.getElementById('data');
        dataContainer.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
    });