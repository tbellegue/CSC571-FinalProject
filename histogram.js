fetch('https://raw.githubusercontent.com/tbellegue/CSC571-FinalProject/master/trips.json')
    .then(response => response.json())
    .then(data => {
        window.histogramTrips = data.features;

        function drawHistogram(trips) {
            d3.select("#histogram").selectAll("*").remove();

            // Extract durations (in minutes)
            const durations = trips
                .map(f => +f.properties.duration / 60)
                .filter(d => !isNaN(d) && d > 0 && d < 120);

            const margin = { top: 40, right: 40, bottom: 50, left: 60 },
                width = 800 - margin.left - margin.right,
                height = 300 - margin.top - margin.bottom;

            const svg = d3.select("#histogram")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain([0, d3.max(durations) || 1])
                .nice()
                .range([0, width]);

            const bins = d3.bin()
                .domain(x.domain())
                .thresholds(x.ticks(30))(durations);

            const y = d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length) || 1])
                .nice()
                .range([height, 0]);

            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "d3-tooltip")
                .style("opacity", 0);

            let selectedBin = null;

            svg.selectAll("rect")
                .data(bins)
                .enter()
                .append("rect")
                .attr("x", d => x(d.x0))
                .attr("y", d => y(d.length))
                .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
                .attr("height", d => height - y(d.length))
                .attr("fill", d => selectedBin === d ? "#e040fb" : "#6a1b9a")
                .attr("opacity", 0.85)
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(
                        `<strong>Duration:</strong> ${d.x0.toFixed(1)}–${d.x1.toFixed(1)} min<br/>
                         <strong>Trips:</strong> ${d.length}`
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
                    d3.select(this).attr("fill", selectedBin === d ? "#e040fb" : "#6a1b9a");
                })
                .on("click", function (event, d) {
                    if (selectedBin === d) {
                        selectedBin = null;
                        svg.selectAll("rect").attr("fill", "#6a1b9a");
                        if (window.clearMapAndScatterForBar) window.clearMapAndScatterForBar();
                        if (window.clearBarHighlight) window.clearBarHighlight();
                        if (window.clearScatterHighlight) window.clearScatterHighlight();
                        if (window.clearLineHighlight) window.clearLineHighlight();
                    } else {
                        selectedBin = d;
                        svg.selectAll("rect").attr("fill", b => b === d ? "#e040fb" : "#6a1b9a");
                        const minSec = d.x0 * 60, maxSec = d.x1 * 60;
                        if (window.filterMapByDuration) window.filterMapByDuration(minSec, maxSec);
                        if (window.filterBarByDuration) window.filterBarByDuration(minSec, maxSec);
                        if (window.filterScatterByDuration) window.filterScatterByDuration(minSec, maxSec);
                        if (window.filterLineByDuration) window.filterLineByDuration(minSec, maxSec);
                    }
                });

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x));

            svg.append("g")
                .call(d3.axisLeft(y));

            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 40)
                .attr("text-anchor", "middle")
                .text("Trip Duration (minutes)");

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -45)
                .attr("text-anchor", "middle")
                .text("Number of Trips");
        }

        // Initial draw
        drawHistogram(window.histogramTrips);

        // Filtering functions for cross-chart interaction
        window.filterHistogramByHour = function (hour) {
            const filtered = window.histogramTrips.filter(f => {
                if (!f.properties.starttime) return false;
                return new Date(f.properties.starttime).getHours() === hour;
            });
            drawHistogram(filtered);
        };

        // Add filterHistogramByTaxi for bar chart interaction
        window.filterHistogramByTaxi = function (taxiid) {
            const filtered = window.histogramTrips.filter(f => f.properties.taxiid === taxiid);
            drawHistogram(filtered);
        };

        window.clearHistogramHighlight = function () {
            drawHistogram(window.histogramTrips);
        };

        window.drawHistogram = drawHistogram;
    });