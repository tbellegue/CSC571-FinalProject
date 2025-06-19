window.tripCircleMap = {};
window.scatterData = [];

fetch('https://raw.githubusercontent.com/tbellegue/CSC571-FinalProject/master/trips.json')
    .then(response => response.json())
    .then(data => {
        window.scatterData = data.features
            .map(f => ({
                duration: +f.properties.duration,
                speed: +f.properties.avspeed,
                tripid: f.properties.tripid,
                taxiid: f.properties.taxiid,
                starttime: f.properties.starttime // include for filtering
            }))
            .filter(d => !isNaN(d.duration) && !isNaN(d.speed));

        const margin = { top: 20, right: 40, bottom: 80, left: 70 };
              width = 800 - margin.left - margin.right,
              height = 400 - margin.top - margin.bottom;

        // Tooltip div
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "d3-tooltip");

        const svg = d3.select("#scatter")
            .append("svg")
            .attr("width", width + margin.left + margin.right + 40) // add extra width
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain(d3.extent(window.scatterData, d => d.duration)).nice()
            .range([0, width]);
        const y = d3.scaleLinear()
            .domain(d3.extent(window.scatterData, d => d.speed)).nice()
            .range([height, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));
        svg.append("g")
            .call(d3.axisLeft(y));

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .attr("text-anchor", "middle")
            .text("Trip Duration (seconds)");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .attr("text-anchor", "middle")
            .text("Average Speed (km/h)");

        function drawPoints(dataToShow) {
            svg.selectAll("circle").remove();
            svg.append("g")
                .selectAll("circle")
                .data(dataToShow)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.duration))
                .attr("cy", d => y(d.speed))
                .attr("r", d => dataToShow.length === 1 ? 5 : 3)
                .attr("fill", d => dataToShow.length === 1 ? "#e040fb" : "#311b92")
                .attr("stroke", d => dataToShow.length === 1 ? "#311b92" : "#e040fb")
                .attr("stroke-width", d => dataToShow.length === 1 ? 3 : 1.5)
                .attr("opacity", d => dataToShow.length === 1 ? 1 : 0.85)
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(
                        `<strong>Taxi ID:</strong> ${d.taxiid}<br/>
                         <strong>Trip ID:</strong> ${d.tripid}<br/>
                         <strong>Duration:</strong> ${d.duration} s<br/>
                         <strong>Avg Speed:</strong> ${d.speed} km/h`
                    )
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
                    d3.select(this)
                        .attr("stroke", "#6a1b9a")
                        .attr("stroke-width", 2.5);
                })
                .on("mousemove", function(event) {
                    tooltip.style("left", (event.pageX + 12) + "px")
                           .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(event, d) {
                    tooltip.transition().duration(150).style("opacity", 0);
                    d3.select(this)
                        .attr("stroke", dataToShow.length === 1 ? "#311b92" : "#e040fb")
                        .attr("stroke-width", dataToShow.length === 1 ? 3 : 1.5);
                })
                .on("click", function(event, d) {
                    drawPoints([d]);
                    if (window.tripLayerMap && window.tripLayerMap[d.tripid]) {
                        if (window.geoJsonLayer && window.fullGeoJsonData) {
                            map.removeLayer(window.geoJsonLayer);
                            const feature = window.fullGeoJsonData.features.find(f => f.properties.tripid === d.tripid);
                            window.geoJsonLayer = L.geoJSON({
                                type: "FeatureCollection",
                                features: [feature]
                            }, {
                                style: { color: "#311b92", weight: 4, opacity: 1 },
                                onEachFeature: function (feature, layer) {
                                    layer.bindPopup(
                                        `<strong>Taxi ID:</strong> ${d.taxiid}<br/>
                                         <strong>Trip ID:</strong> ${d.tripid}<br/>
                                         <strong>Avg Speed:</strong> ${d.speed} km/h`
                                    );
                                    layer.on('click', function () {
                                        if (window.highlightScatterByTripId) {
                                            window.highlightScatterByTripId(d.tripid);
                                        }
                                        layer.openPopup();
                                    });
                                }
                            }).addTo(map);
                            window.tripLayerMap[d.tripid].openPopup();
                        }
                    }
                    if (window.clearBarHighlight) window.clearBarHighlight();
                });
        }

        drawPoints(window.scatterData);

        window.highlightScatterByTripId = function(tripid) {
            const d = window.scatterData.find(d => d.tripid === tripid);
            if (d) drawPoints([d]);
        };

        window.clearScatterHighlight = function() {
            drawPoints(window.scatterData);
        };

        // Linked bar chart filter support
        window.filterScatterByTaxi = function(taxiid) {
            drawPoints(window.scatterData.filter(d => d.taxiid === taxiid));
        };

        // Time slider filter support
        window.filterScatterByHour = function(hour) {
            drawPoints(window.scatterData.filter(d => {
                if (!d.starttime) return false;
                return new Date(d.starttime).getHours() === hour;
            }));
        };
    })
    .catch(error => console.error('Error loading or parsing data for D3 scatterplot:', error));