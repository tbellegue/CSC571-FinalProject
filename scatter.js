fetch('https://raw.githubusercontent.com/tbellegue/CSC571-FinalProject/master/trips.json')
    .then(response => response.json())
    .then(data => {
        window.scatterData = data.features.map(f => ({
            tripid: f.properties.tripid,
            taxiid: f.properties.taxiid,
            duration: +f.properties.duration,
            avspeed: +f.properties.avspeed,
            starttime: f.properties.starttime
        }));

        function drawPoints(points) {
            d3.select("#scatter").selectAll("*").remove();

            const margin = { top: 40, right: 40, bottom: 60, left: 70 },
                width = 800 - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            const svg = d3.select("#scatter")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // X: Duration (minutes)
            const x = d3.scaleLinear()
                .domain([0, d3.max(points, d => d.duration / 60) || 1])
                .nice()
                .range([0, width]);

            // Y: Average speed
            const y = d3.scaleLinear()
                .domain([0, d3.max(points, d => d.avspeed) || 1])
                .nice()
                .range([height, 0]);

            // X axis
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x));

            // Y axis
            svg.append("g")
                .call(d3.axisLeft(y));

            // Tooltip
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "d3-tooltip")
                .style("opacity", 0);

            // State for selected trip
            let selectedTrip = null;

            // Points
            svg.selectAll("circle")
                .data(points)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.duration / 60))
                .attr("cy", d => y(d.avspeed))
                .attr("r", 5)
                .attr("fill", d => selectedTrip === d.tripid ? "#e040fb" : "#6a1b9a")
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.2)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(
                        `<strong>Taxi ID:</strong> ${d.taxiid}<br/>
                         <strong>Trip ID:</strong> ${d.tripid}<br/>
                         <strong>Duration:</strong> ${(d.duration / 60).toFixed(1)} min<br/>
                         <strong>Avg Speed:</strong> ${d.avspeed} km/h`
                    )
                        .style("left", (event.pageX + 12) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    d3.select(this).attr("fill", "#e040fb");
                })
                .on("mousemove", function (event) {
                    tooltip.style("left", (event.pageX + 12) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function (event, d) {
                    tooltip.transition().duration(150).style("opacity", 0);
                    d3.select(this).attr("fill", selectedTrip === d.tripid ? "#e040fb" : "#6a1b9a");
                })
                .on("click", function (event, d) {
                    if (selectedTrip === d.tripid) {
                        selectedTrip = null;
                        svg.selectAll("circle").attr("fill", "#6a1b9a");
                        if (window.clearBarHighlight) window.clearBarHighlight();
                        if (window.clearHistogramHighlight) window.clearHistogramHighlight();
                        if (window.clearLineHighlight) window.clearLineHighlight();
                        if (window.clearMapAndScatterForBar) window.clearMapAndScatterForBar();
                    } else {
                        selectedTrip = d.tripid;
                        svg.selectAll("circle").attr("fill", p => p.tripid === d.tripid ? "#e040fb" : "#6a1b9a");
                        if (window.highlightMapByTripId) window.highlightMapByTripId(d.tripid);
                        if (window.highlightBarByTripId) window.highlightBarByTripId(d.tripid);
                    }
                });

            // X axis label
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 50)
                .attr("text-anchor", "middle")
                .text("Trip Duration (minutes)");

            // Y axis label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("text-anchor", "middle")
                .text("Average Speed (km/h)");
        }

        // Initial draw
        drawPoints(window.scatterData);

        // Filtering functions for cross-chart interaction
        window.filterScatterByHour = function (hour) {
            const filtered = window.scatterData.filter(d => {
                if (!d.starttime) return false;
                return new Date(d.starttime).getHours() === hour;
            });
            drawPoints(filtered);
        };

        window.filterScatterByDuration = function (minSec, maxSec) {
            const filtered = window.scatterData.filter(d => d.duration >= minSec && d.duration < maxSec);
            drawPoints(filtered);
        };

        window.filterScatterByTaxi = function (taxiid) {
            const filtered = window.scatterData.filter(d => d.taxiid === taxiid);
            drawPoints(filtered);
        };

        window.clearScatterHighlight = function () {
            drawPoints(window.scatterData);
        };

        window.highlightScatterByTripId = function (tripid) {
            d3.select("#scatter").selectAll("circle")
                .attr("fill", d => d.tripid === tripid ? "#e040fb" : "#6a1b9a");
        };
    });