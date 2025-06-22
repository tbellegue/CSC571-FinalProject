window.tripLayerMap = {};
window.geoJsonLayer = null;
window.fullGeoJsonData = null;

const map = L.map('map').setView([41.1579, -8.6291], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

function getColorFactory(minFreq, maxFreq) {
    return function(freq) {
        const t = (freq - minFreq) / (maxFreq - minFreq);
        return d3.interpolateRgb("#e040fb", "#311b92")(t);
    };
}

function onEachFeatureFactory(getColor) {
    return function onEachFeature(feature, layer) {
        const props = feature.properties;
        if (props) {
            window.tripLayerMap[props.tripid] = layer;
            const freq = props.frequency || (parseInt(props.tripid, 10) % 100);
            const popupContent = "<strong>Taxi ID:</strong> " + props.taxiid +
                "<br><strong>Trip ID:</strong> " + props.tripid +
                "<br><strong>Avg Speed:</strong> " + props.avspeed + " km/h" +
                "<br><strong>Frequency:</strong> " + freq;
            layer.bindPopup(popupContent);

            layer.on('click', function () {
                if (window.geoJsonLayer) map.removeLayer(window.geoJsonLayer);
                window.geoJsonLayer = L.geoJSON({
                    type: "FeatureCollection",
                    features: [feature]
                }, {
                    style: function () { return { color: "#311b92", weight: 4, opacity: 1 }; },
                    onEachFeature: onEachFeatureFactory(getColor)
                }).addTo(map);
                if (window.highlightScatterByTripId) {
                    window.highlightScatterByTripId(props.tripid);
                }
                if (window.clearBarHighlight) window.clearBarHighlight();
                layer.openPopup();
            });
        }
    };
}

let allTrips = [];
let sliderInterval = null;

// Heatmap layers
let pickupHeatLayer = null;
let dropoffHeatLayer = null;

function createHeatLayer(coords) {
    return L.heatLayer(coords, {
        radius: 18,
        blur: 22,
        maxZoom: 17,
        gradient: {0.4: '#e040fb', 0.65: '#6a1b9a', 1: '#311b92'}
    });
}

function showPickupHeatmap(trips) {
    if (window.geoJsonLayer) {
        map.removeLayer(window.geoJsonLayer);
        window.geoJsonLayer = null;
    }
    if (pickupHeatLayer) map.removeLayer(pickupHeatLayer);
    if (dropoffHeatLayer) map.removeLayer(dropoffHeatLayer);
    const coords = trips
        .map(f => f.geometry && f.geometry.coordinates && f.geometry.coordinates[0])
        .filter(c => Array.isArray(c) && c.length === 2)
        .map(c => [c[1], c[0]]);
    pickupHeatLayer = createHeatLayer(coords).addTo(map);
}

function showDropoffHeatmap(trips) {
    if (window.geoJsonLayer) {
        map.removeLayer(window.geoJsonLayer);
        window.geoJsonLayer = null;
    }
    if (pickupHeatLayer) map.removeLayer(pickupHeatLayer);
    if (dropoffHeatLayer) map.removeLayer(dropoffHeatLayer);
    const coords = trips
        .map(f => f.geometry && f.geometry.coordinates && f.geometry.coordinates.slice(-1)[0])
        .filter(c => Array.isArray(c) && c.length === 2)
        .map(c => [c[1], c[0]]);
    dropoffHeatLayer = createHeatLayer(coords).addTo(map);
}

function hideHeatmap() {
    if (pickupHeatLayer) map.removeLayer(pickupHeatLayer);
    if (dropoffHeatLayer) map.removeLayer(dropoffHeatLayer);
    // Restore lines if needed
    if (!window.geoJsonLayer && window.fullGeoJsonData) {
        const frequencies = window.fullGeoJsonData.features.map(f => f.properties.frequency || (parseInt(f.properties.tripid, 10) % 100));
        const minFreq = Math.min(...frequencies);
        const maxFreq = Math.max(...frequencies);
        const getColor = getColorFactory(minFreq, maxFreq);
        window.geoJsonLayer = L.geoJSON(window.fullGeoJsonData, {
            style: function (feature) {
                const freq = feature.properties.frequency || (parseInt(feature.properties.tripid, 10) % 100);
                return { opacity: 1, color: getColor(freq), weight: 2 };
            },
            onEachFeature: onEachFeatureFactory(getColor)
        }).addTo(map);
    }
}

fetch('https://raw.githubusercontent.com/tbellegue/CSC571-FinalProject/master/trips.json')
    .then(response => response.json())
    .then(data => {
        window.fullGeoJsonData = data;
        allTrips = data.features;
        const frequencies = data.features.map(f => f.properties.frequency || (parseInt(f.properties.tripid, 10) % 100));
        const minFreq = Math.min(...frequencies);
        const maxFreq = Math.max(...frequencies);
        const getColor = getColorFactory(minFreq, maxFreq);

        // Default: Show all trips (no filter)
        if (window.geoJsonLayer) map.removeLayer(window.geoJsonLayer);
        window.geoJsonLayer = L.geoJSON(data, {
            style: function (feature) {
                const freq = feature.properties.frequency || (parseInt(feature.properties.tripid, 10) % 100);
                return { color: getColor(freq), weight: 2, opacity: 1 };
            },
            onEachFeature: onEachFeatureFactory(getColor)
        }).addTo(map);

        // Add legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML += `<div style="width:140px;height:14px;background:linear-gradient(to right,#e040fb,#6a1b9a,#311b92);margin-bottom:4px;"></div>`;
            div.innerHTML +=
                `<div style="display:flex;justify-content:space-between;">
                    <span style="color:#333;font-size:12px;">${Math.round(minFreq)}</span>
                    <span style="color:#333;font-size:12px;">${Math.round(maxFreq)}</span>
                </div>
                <div style="font-size:12px;color:#333;text-align:center;">Least → Most Traveled</div>`;
            return div;
        };
        legend.addTo(map);

        // Slider event
        document.getElementById('time-slider').addEventListener('input', function(e) {
            const hour = +e.target.value;
            document.getElementById('time-slider-value').textContent = hour;
            updateMapForHour(hour);
            if (window.filterScatterByHour) window.filterScatterByHour(hour);
            if (window.filterBarByHour) window.filterBarByHour(hour);
            if (window.filterLineByHour) window.filterLineByHour(hour);
            if (window.filterHistogramByHour) window.filterHistogramByHour(hour);
        });

        // Play/Pause animation
        document.getElementById('play-slider').addEventListener('click', function() {
            if (sliderInterval) return;
            let hour = +document.getElementById('time-slider').value;
            sliderInterval = setInterval(() => {
                hour = (hour + 1) % 24;
                document.getElementById('time-slider').value = hour;
                document.getElementById('time-slider-value').textContent = hour;
                updateMapForHour(hour);
                if (window.filterScatterByHour) window.filterScatterByHour(hour);
                if (window.filterBarByHour) window.filterBarByHour(hour);
                if (window.filterLineByHour) window.filterLineByHour(hour);
                if (window.filterHistogramByHour) window.filterHistogramByHour(hour);
            }, 800);
        });
        document.getElementById('pause-slider').addEventListener('click', function() {
            clearInterval(sliderInterval);
            sliderInterval = null;
        });

        // Heatmap controls
        document.getElementById('show-pickup-heat').onclick = function() {
            showPickupHeatmap(allTrips);
        };
        document.getElementById('show-dropoff-heat').onclick = function() {
            showDropoffHeatmap(allTrips);
        };
        document.getElementById('hide-heat').onclick = function() {
            hideHeatmap();
        };
    })
    .catch(error => console.error('Error loading GeoJSON:', error));

window.updateMapForHour = function(hour) {
    if (window.geoJsonLayer) map.removeLayer(window.geoJsonLayer);
    const filtered = allTrips.filter(f => {
        if (!f.properties.starttime) return false;
        const tripHour = new Date(f.properties.starttime).getHours();
        return tripHour === hour;
    });
    window.geoJsonLayer = L.geoJSON({
        type: "FeatureCollection",
        features: filtered
    }, {
        style: function (feature) {
            const freq = feature.properties.frequency || (parseInt(feature.properties.tripid, 10) % 100);
            return { color: getColorFactory(0, 100)(freq), weight: 2, opacity: 1 };
        },
        onEachFeature: onEachFeatureFactory(getColorFactory(0, 100))
    }).addTo(map);
};

// Linked bar chart filter support
window.filterMapAndScatterByTaxi = function(taxiid) {
    if (window.geoJsonLayer && window.fullGeoJsonData) {
        map.removeLayer(window.geoJsonLayer);
        const filtered = window.fullGeoJsonData.features.filter(f => f.properties.taxiid === taxiid);
        const frequencies = filtered.map(f => f.properties.frequency || (parseInt(f.properties.tripid, 10) % 100));
        const minFreq = Math.min(...frequencies);
        const maxFreq = Math.max(...frequencies);
        const getColor = getColorFactory(minFreq, maxFreq);

        window.geoJsonLayer = L.geoJSON({
            type: "FeatureCollection",
            features: filtered
        }, {
            style: function (feature) {
                const freq = feature.properties.frequency || (parseInt(feature.properties.tripid, 10) % 100);
                return { opacity: 1, color: getColor(freq), weight: 2 };
            },
            onEachFeature: onEachFeatureFactory(getColor)
        }).addTo(map);
    }
    if (window.filterScatterByTaxi) window.filterScatterByTaxi(taxiid);
};

window.clearMapAndScatterForBar = function() {
    document.getElementById('clearFilters').click();
};

// Histogram filter support
window.filterMapByDuration = function(minSec, maxSec) {
    if (window.geoJsonLayer && window.fullGeoJsonData) {
        map.removeLayer(window.geoJsonLayer);
        const filtered = window.fullGeoJsonData.features.filter(f => {
            const dur = +f.properties.duration;
            return dur >= minSec && dur < maxSec;
        });
        const getColor = getColorFactory(0, 100);
        window.geoJsonLayer = L.geoJSON({
            type: "FeatureCollection",
            features: filtered
        }, {
            style: function (feature) {
                const freq = feature.properties.frequency || (parseInt(feature.properties.tripid, 10) % 100);
                return { color: getColor(freq), weight: 2, opacity: 1 };
            },
            onEachFeature: onEachFeatureFactory(getColor)
        }).addTo(map);
    }
};

// (Optional) Filter map by hour for line chart interaction
window.filterMapByHour = function(hour) {
    window.updateMapForHour(hour);
};

// Clear Filters button logic
document.getElementById('clearFilters').addEventListener('click', function () {
    document.getElementById('time-slider').value = 0;
    document.getElementById('time-slider-value').textContent = 0;

    if (window.geoJsonLayer && window.fullGeoJsonData) {
        map.removeLayer(window.geoJsonLayer);
        const frequencies = window.fullGeoJsonData.features.map(f => f.properties.frequency || (parseInt(f.properties.tripid, 10) % 100));
        const minFreq = Math.min(...frequencies);
        const maxFreq = Math.max(...frequencies);
        const getColor = getColorFactory(minFreq, maxFreq);

        window.geoJsonLayer = L.geoJSON(window.fullGeoJsonData, {
            style: function (feature) {
                const freq = feature.properties.frequency || (parseInt(feature.properties.tripid, 10) % 100);
                return { opacity: 1, color: getColor(freq), weight: 2 };
            },
            onEachFeature: onEachFeatureFactory(getColor)
        }).addTo(map);
    }
    if (window.clearScatterHighlight) window.clearScatterHighlight();
    if (window.clearBarHighlight) window.clearBarHighlight();
    if (window.clearHistogramHighlight) window.clearHistogramHighlight();
    if (window.clearLineHighlight) window.clearLineHighlight();
    hideHeatmap();
});