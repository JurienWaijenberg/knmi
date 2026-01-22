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

// Function to get color based on NO₂ concentration value
// Matches the legend color ranges: 0-10, 10-20, 20-30, 30-40, 50-60, 60-70
function getColorForNO2(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '#aaaaaa'; // Default color when no data
    }
    
    const no2Value = parseFloat(value);
    
    if (no2Value >= 0 && no2Value < 10) {
        return '#7ed8ca'; // 0-10
    } else if (no2Value >= 10 && no2Value < 20) {
        return '#5eb5a7'; // 10-20
    } else if (no2Value >= 20 && no2Value < 30) {
        return '#3d9f90'; // 20-30
    } else if (no2Value >= 30 && no2Value < 40) {
        return '#267165'; // 30-40
    } else if (no2Value >= 40 && no2Value < 50) {
        return '#267165'; // 40-50 (using 30-40 color since legend skips this range)
    } else if (no2Value >= 50 && no2Value < 60) {
        return '#0c5554'; // 50-60
    } else if (no2Value >= 60 && no2Value < 70) {
        return '#043931'; // 60-70
    } else if (no2Value >= 70) {
        return '#043931'; // 70+ (using darkest color)
    } else {
        return '#aaaaaa'; // Default for negative values
    }
}

// Function to get the last measurement's NO₂ value
function getLastNO2Value(location) {
    if (!location.measurements || location.measurements.length === 0) {
        return null;
    }
    
    // Sort measurements by date and get the most recent one
    const sortedMeasurements = [...location.measurements].sort((a, b) => {
        const dateA = new Date(a.start_date || a.end_date || 0);
        const dateB = new Date(b.start_date || b.end_date || 0);
        return dateB - dateA;
    });
    
    const lastMeasurement = sortedMeasurements[0];
    return lastMeasurement ? parseFloat(lastMeasurement.no2_concentration) : null;
}

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

// Function to populate locations list in the dropdown menu
function populateLocationsList(citiesData, selectedCity = null) {
    const locationsList = document.getElementById('locationsList');
    locationsList.innerHTML = '';
    
    // Collect locations - filter by selected city if provided
    const allLocations = [];
    citiesData.forEach(city => {
        // If a city is selected, only show locations from that city
        if (selectedCity && city.name !== selectedCity) {
            return;
        }
        
        if (city.locations && city.locations.length > 0) {
            city.locations.forEach(location => {
                // Store location with city name for display
                allLocations.push({
                    ...location,
                    cityName: city.name
                });
            });
        }
    });
    
    // Create list items for each location
    allLocations.forEach(location => {
        const listItem = document.createElement('div');
        listItem.className = 'location-list-item';
        
        // Get the last NO₂ value for color indicator
        const lastNO2Value = getLastNO2Value(location);
        const locationColor = getColorForNO2(lastNO2Value);
        
        // Create location item content
        listItem.innerHTML = `
            <div class="location-list-indicator" style="background-color: ${locationColor};"></div>
            <div class="location-list-content">
                <div class="location-list-name">${location.name || 'Unknown Location'}</div>
                <div class="location-list-city">${location.cityName}</div>
            </div>
        `;
        
        // Add click handler to show location details
        listItem.addEventListener('click', function() {
            showLocationDetails(location);
            // Close the dropdown menu after clicking
            toggleSidebar();
        });
        
        locationsList.appendChild(listItem);
    });
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
                // Get the last NO₂ value for this location
                const lastNO2Value = getLastNO2Value(location);
                const markerColor = getColorForNO2(lastNO2Value);
                
                // Create marker with custom icon (color based on NO₂ value)
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background-color: ${markerColor}; width: 50px; height: 50px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [50, 50],
                        iconAnchor: [25, 25]
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
    const selectedCity = this.value;
    filterCitiesBySelection(selectedCity);
    // Update locations list to show only locations from selected city
    populateLocationsList(allCitiesData, selectedCity);
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
        
        // Populate locations list with Kumasi locations
        populateLocationsList(allCitiesData, 'Kumasi');
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
    
    // Generate month selector first (needed for linking)
    generateMonthSelector(location);
    
    // Generate chart bars (after month selector so we can link them)
    generateChartBars(location);
    
    // Show panel
    locationDetailsPanel.classList.add('active');
}

function generateChartBars(location) {
    const chartBars = document.getElementById('chartBars');
    chartBars.innerHTML = '';
    
    if (!location.measurements || location.measurements.length === 0) {
        return;
    }
    
    // Get measurements with valid month and NO₂ concentration
    const measurements = [...location.measurements]
        .filter(m => m.month != null && !isNaN(parseFloat(m.no2_concentration)))
        .sort((a, b) => {
            // Sort by month - convert to string for comparison
            const monthA = String(a.month);
            const monthB = String(b.month);
            return monthA.localeCompare(monthB);
        });
    
    if (measurements.length === 0) {
        return;
    }
    
    // Group measurements by month
    const monthGroups = {};
    measurements.forEach(measurement => {
        const monthKey = String(measurement.month); // Convert to string for consistent key
        if (!monthGroups[monthKey]) {
            monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(measurement);
    });
    
    // Get sorted month keys and take last 12
    const sortedMonthKeys = Object.keys(monthGroups).sort().slice(-12);
    
    // Create data for bars: one per month with average value
    const barData = sortedMonthKeys.map(monthKey => {
        const monthMeasurements = monthGroups[monthKey];
        const avgValue = monthMeasurements.reduce((sum, m) => sum + parseFloat(m.no2_concentration || 0), 0) / monthMeasurements.length;
        return {
            monthKey: monthKey,
            value: avgValue,
            measurements: monthMeasurements
        };
    });
    
    if (barData.length === 0) {
        return;
    }
    
    // Chart dimensions
    const chartHeight = 220;
    const chartWidth = chartBars.offsetWidth || 393; // Use actual width or fallback
    const barGap = 8;
    
    // Fixed scale: 0 to 100 µg/m³ for consistent comparison across locations
    const maxValue = 100;
    const minValue = 0;
    
    // Create SVG using D3
    const svg = d3.select(chartBars)
        .append('svg')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .style('position', 'absolute')
        .style('bottom', '0')
        .style('left', '0');
    
    // Create scales
    const xScale = d3.scaleBand()
        .domain(d3.range(barData.length))
        .range([0, chartWidth])
        .paddingInner(barGap / (chartWidth / barData.length));
    
    const yScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([chartHeight, 0]);
    
    // Create bars
    const bars = svg.selectAll('rect')
        .data(barData)
        .enter()
        .append('rect')
        .attr('x', (d, i) => xScale(i))
        .attr('y', d => {
            const barHeight = Math.max((d.value / maxValue) * chartHeight, 0);
            return chartHeight - barHeight;
        })
        .attr('width', xScale.bandwidth())
        .attr('height', d => {
            return Math.max((d.value / maxValue) * chartHeight, 0);
        })
        .attr('fill', '#043931')
        .attr('rx', 8) // Border radius
        .attr('ry', 8)
        .style('transition', 'opacity 0.2s ease')
        .attr('class', 'chart-bar')
        .attr('data-month-key', d => d.monthKey)
        .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 0.8);
            
            // Hide all month items
            const monthItems = document.querySelectorAll('.month-item');
            monthItems.forEach(item => {
                item.style.display = 'none';
            });
            
            // Show only the matching month item
            const matchingMonthItem = document.querySelector(`.month-item[data-month-key="${d.monthKey}"]`);
            if (matchingMonthItem) {
                matchingMonthItem.style.display = 'block';
            }
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 1);
            
            // Show all month items
            const monthItems = document.querySelectorAll('.month-item');
            monthItems.forEach(item => {
                item.style.display = 'block';
            });
        });
    
    // Add tooltips
    bars.append('title')
        .text(d => `${d.value.toFixed(1)} µg/m³`);
}

function generateMonthSelector(location) {
    const monthSelector = document.getElementById('locationMonthSelector');
    monthSelector.innerHTML = '';
    
    if (!location.measurements || location.measurements.length === 0) {
        return;
    }
    
    // Get measurements with valid month and NO₂ concentration
    const measurements = [...location.measurements]
        .filter(m => m.month != null && !isNaN(parseFloat(m.no2_concentration)))
        .sort((a, b) => {
            // Sort by month - convert to string for comparison
            const monthA = String(a.month);
            const monthB = String(b.month);
            return monthA.localeCompare(monthB);
        });
    
    // Group measurements by month
    const monthGroups = {};
    measurements.forEach(measurement => {
        const monthKey = String(measurement.month); // Convert to string for consistent key
        if (!monthGroups[monthKey]) {
            monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(measurement);
    });
    
    // Get sorted month keys and take last 12 (same as bars)
    const sortedMonthKeys = Object.keys(monthGroups).sort().slice(-12);
    
    // Helper function to format month name (handles formats like "2025-11", "11", "November", etc.)
    function formatMonthName(monthKey) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        // If it's in format "YYYY-MM" or "YYYY-M"
        if (monthKey.includes('-')) {
            const parts = monthKey.split('-');
            if (parts.length >= 2) {
                const monthIndex = parseInt(parts[1]) - 1; // Convert to 0-based index
                if (monthIndex >= 0 && monthIndex < 12) {
                    return monthNames[monthIndex];
                }
            }
        }
        
        // If it's just a number (1-12), convert to month name
        const monthNum = parseInt(monthKey);
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            return monthNames[monthNum - 1]; // Convert 1-12 to 0-11 index
        }
        
        // If it's already a month name, return as is (capitalize first letter)
        return monthKey.charAt(0).toUpperCase() + monthKey.slice(1).toLowerCase();
    }
    
    sortedMonthKeys.forEach(monthKey => {
        const monthMeasurements = monthGroups[monthKey];
        const avgValue = monthMeasurements.reduce((sum, m) => sum + parseFloat(m.no2_concentration || 0), 0) / monthMeasurements.length;
        
        const monthItem = document.createElement('div');
        monthItem.className = 'month-item';
        monthItem.setAttribute('data-month-key', monthKey);
        monthItem.innerHTML = `
            <div class="month-name">${formatMonthName(monthKey)}</div>
            <div class="month-value">${avgValue.toFixed(1)} µg/m³</div>
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