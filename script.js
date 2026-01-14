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
let currentLocationData = null;

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
                // Create marker with custom icon (teal color to match design)
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: #5ac8b3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map);
                
                // Store location data with marker
                marker.locationData = location;
                
                // Bind click event to show location details panel
                marker.on('click', function() {
                    showLocationDetails(location);
                });
                
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

// Location details panel functionality
const locationDetailsPanel = document.getElementById('locationDetailsPanel');
const locationPanelOverlay = document.getElementById('locationPanelOverlay');
const closeLocationPanel = document.getElementById('closeLocationPanel');

function showLocationDetails(location) {
    currentLocationData = location;
    
    // Update header information
    const locationNameHeader = document.getElementById('locationNameHeader');
    const locationValue = document.getElementById('locationValue');
    const locationDate = document.getElementById('locationDate');
    
    locationNameHeader.textContent = location.name || 'Unknown Location';
    
    // Get the most recent measurement or calculate average
    if (location.measurements && location.measurements.length > 0) {
        const latestMeasurement = location.measurements[location.measurements.length - 1];
        const avgValue = location.measurements.reduce((sum, m) => sum + parseFloat(m.no2_concentration || 0), 0) / location.measurements.length;
        locationValue.textContent = `${Math.round(avgValue)} µg/m³`;
        
        // Set date from latest measurement
        if (latestMeasurement.start_date) {
            const date = new Date(latestMeasurement.start_date);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            locationDate.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        }
    } else {
        locationValue.textContent = 'N/A';
        locationDate.textContent = 'No data';
    }
    
    // Generate chart bars
    generateChartBars(location);
    
    // Generate month selector
    generateMonthSelector(location);
    
    // Show panel
    locationDetailsPanel.classList.add('active');
}

function generateChartBars(location) {
    const chartBars = document.getElementById('chartBars');
    chartBars.innerHTML = '';
    
    if (!location.measurements || location.measurements.length === 0) {
        return;
    }
    
    // Get measurements and sort by date
    const measurements = [...location.measurements]
        .filter(m => m.start_date && !isNaN(parseFloat(m.no2_concentration)))
        .sort((a, b) => {
            return new Date(a.start_date) - new Date(b.start_date);
        });
    
    if (measurements.length === 0) {
        return;
    }
    
    // Limit to last 12 measurements for better visualization
    const displayMeasurements = measurements.slice(-12);
    
    // Calculate max value for scaling (add some padding)
    const values = displayMeasurements.map(m => parseFloat(m.no2_concentration || 0));
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;
    const paddedMax = maxValue + (range * 0.1); // Add 10% padding
    const chartHeight = 220; // Height of chart area in pixels
    
    // Create bars
    displayMeasurements.forEach(measurement => {
        const value = parseFloat(measurement.no2_concentration || 0);
        const barHeight = paddedMax > 0 ? Math.max((value / paddedMax) * chartHeight, 5) : 5; // Minimum 5px height
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${barHeight}px`;
        bar.title = `${value.toFixed(1)} µg/m³`;
        chartBars.appendChild(bar);
    });
}

function generateMonthSelector(location) {
    const monthSelector = document.getElementById('locationMonthSelector');
    monthSelector.innerHTML = '';
    
    if (!location.measurements || location.measurements.length === 0) {
        return;
    }
    
    // Group measurements by month
    const monthGroups = {};
    location.measurements.forEach(measurement => {
        if (measurement.start_date) {
            const date = new Date(measurement.start_date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthGroups[monthKey]) {
                monthGroups[monthKey] = [];
            }
            monthGroups[monthKey].push(measurement);
        }
    });
    
    // Create month items
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    Object.keys(monthGroups).sort().reverse().forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const measurements = monthGroups[monthKey];
        const avgValue = measurements.reduce((sum, m) => sum + parseFloat(m.no2_concentration || 0), 0) / measurements.length;
        
        const monthItem = document.createElement('div');
        monthItem.className = 'month-item';
        monthItem.innerHTML = `
            <div class="month-name">${monthNames[parseInt(month)]}</div>
            <div class="month-value">${Math.round(avgValue)} µg/m³</div>
        `;
        monthSelector.appendChild(monthItem);
    });
}

function closeLocationDetails() {
    locationDetailsPanel.classList.remove('active');
    currentLocationData = null;
}

// Close panel events
closeLocationPanel.addEventListener('click', closeLocationDetails);
locationPanelOverlay.addEventListener('click', closeLocationDetails);

// Year navigation (placeholder functionality)
document.getElementById('prevYear').addEventListener('click', function() {
    // TODO: Implement year navigation
    console.log('Previous year');
});

document.getElementById('nextYear').addEventListener('click', function() {
    // TODO: Implement year navigation
    console.log('Next year');
});