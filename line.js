fetch('https://raw.githubusercontent.com/tbellegue/CSC571-FinalProject/master/trips.json')
    .then(response => response.json())
    .then(data => {
        window.lineTrips = data.features;

        function drawLineChart(trips, selectedHour = null) {
            console.log("drawLineChart called, trips:", trips.length, "selectedHour:", selectedHour);
            d3.select("#line").selectAll("*").remove();

            // Count trips by hour
            const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
            trips.forEach(f => {
                if (f.properties.starttime) {
                    const hour = new Date(f.properties.starttime).getHours();
                    hourCounts[hour].count += 1;
                }
            });

            const margin = { top: 40, right: 40, bottom: 50, left: 60 },
                width = 800 - margin.left - margin.right,
                height = 300 - margin.top - margin.bottom;

            const svg = d3.select("#line")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain([0, 23])
                .range([0, width]);

            const y = d3.scaleLinear()
                .domain([0, 400])
                .range([height, 0]);

            // X axis
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(24).tickFormat(d => d));

            // Y axis
            svg.append("g")
                .call(d3.axisLeft(y));

            // Line
            const line = d3.line()
                .x(d => x(d.hour))
                .y(d => y(d.count));

            svg.append("path")
                .datum(hourCounts)
                .attr("fill", "none")
                .attr("stroke", "#6a1b9a")
                .attr("stroke-width", 3)
                .attr("d", line);

            // Tooltip
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "d3-tooltip")
                .style("opacity", 0);

            // Points
            svg.selectAll("circle")
                .data(hourCounts)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.hour))
                .attr("cy", d => y(d.count))
                .attr("r", 5)
                .attr("fill", d => selectedHour === d.hour ? "#e040fb" : "#311b92")
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(
                        `<strong>Hour:</strong> ${d.hour}:00<br/>
                         <strong>Trips:</strong> ${d.count}`
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
                    d3.select(this).attr("fill", selectedHour === d.hour ? "#e040fb" : "#311b92");
                })
                .on("click", function (event, d) {
                    if (selectedHour === d.hour) {
                        drawLineChart(trips, null);
                        if (window.clearBarHighlight) window.clearBarHighlight();
                        if (window.clearScatterHighlight) window.clearScatterHighlight();
                        if (window.clearHistogramHighlight) window.clearHistogramHighlight();
                        if (window.clearLineHighlight) window.clearLineHighlight();
                        if (window.clearMapAndScatterForBar) window.clearMapAndScatterForBar();
                    } else {
                        drawLineChart(trips, d.hour);
                        if (window.filterBarByHour) window.filterBarByHour(d.hour);
                        if (window.filterScatterByHour) window.filterScatterByHour(d.hour);
                        if (window.filterHistogramByHour) window.filterHistogramByHour(d.hour);
                        if (window.filterMapByHour) window.filterMapByHour(d.hour);
                    }
                });

            // X axis label
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 40)
                .attr("text-anchor", "middle")
                .text("Hour of Day");

            // Y axis label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -45)
                .attr("text-anchor", "middle")
                .text("Number of Trips");
        }

        // Initial draw
        drawLineChart(window.lineTrips);

        // Filtering functions for cross-chart interaction
        window.filterLineByDuration = function (minSec, maxSec) {
            const filteredTrips = window.lineTrips.filter(f => {
                const dur = +f.properties.duration;
                return dur >= minSec && dur < maxSec;
            });
            drawLineChart(filteredTrips);
        };

        window.filterLineByHour = function (hour) {
            const filteredTrips = window.lineTrips.filter(f => {
                if (!f.properties.starttime) return false;
                return new Date(f.properties.starttime).getHours() === hour;
            });
            drawLineChart(filteredTrips);
        };

        // Add filterLineByTaxi for bar chart interaction
        window.filterLineByTaxi = function (taxiid) {
            const filteredTrips = window.lineTrips.filter(f => f.properties.taxiid === taxiid);
            drawLineChart(filteredTrips);
        };

        window.clearLineHighlight = function () {
            // Hide any lingering tooltip
            d3.selectAll('.d3-tooltip').transition().duration(150).style('opacity', 0);
            drawLineChart(window.lineTrips);
        };
    });