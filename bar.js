window.barChartSelectedTaxi = null;
window.rawTrips = [];

fetch('https://raw.githubusercontent.com/tbellegue/CSC571-FinalProject/master/trips.json')
    .then(response => response.json())
    .then(data => {
        window.rawTrips = data.features;

        function drawBarChart(trips) {
            d3.select("#bar").selectAll("*").remove();

            // Count trips per taxiid
            const taxiCounts = d3.rollups(
                trips,
                v => v.length,
                f => f.properties.taxiid
            ).map(([taxiid, count]) => ({taxiid, count}));

            taxiCounts.sort((a, b) => d3.descending(a.count, b.count));
            const topN = 20;
            const topTaxiCounts = taxiCounts.slice(0, topN);

            const margin = { top: 20, right: 40, bottom: 80, left: 70 }; // increased top margin
                width = 800 - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            const svg = d3.select("#bar")
                .append("svg")
                .attr("width", width + margin.left + margin.right + 40) // add extra width
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand()
                .domain(topTaxiCounts.map(d => d.taxiid))
                .range([0, width])
                .padding(0.2);

            const maxCount = d3.max(topTaxiCounts, d => d.count) || 1;
            const y = d3.scaleLinear()
                .domain([0, maxCount * 1.15])
                .nice()
                .range([height, 0]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            svg.append("g")
                .call(d3.axisLeft(y));

            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 10)
                .attr("text-anchor", "middle")
                .text("Taxi ID");

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 15)
                .attr("text-anchor", "middle")
                .text("Trip Count");

            // Tooltip for bars
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "d3-tooltip")
                .style("opacity", 0);

            svg.selectAll(".bar")
                .data(topTaxiCounts)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.taxiid))
                .attr("y", d => y(d.count))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.count))
                .attr("fill", "#6a1b9a")
                .style("cursor", "pointer")
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(
                        `<strong>Taxi ID:</strong> ${d.taxiid}<br/>
                         <strong>Trip Count:</strong> ${d.count}`
                    )
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
                    d3.select(this).attr("fill", "#e040fb");
                })
                .on("mousemove", function(event) {
                    tooltip.style("left", (event.pageX + 12) + "px")
                           .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(event, d) {
                    tooltip.transition().duration(150).style("opacity", 0);
                    d3.select(this).attr("fill", function(d) {
                        return window.barChartSelectedTaxi === d.taxiid ? "#e040fb" : "#6a1b9a";
                    });
                })
                .on("click", function(event, d) {
                    if (window.barChartSelectedTaxi === d.taxiid) {
                        window.barChartSelectedTaxi = null;
                        d3.selectAll(".bar").attr("fill", "#6a1b9a");
                        if (window.clearMapAndScatterForBar) window.clearMapAndScatterForBar();
                    } else {
                        window.barChartSelectedTaxi = d.taxiid;
                        d3.selectAll(".bar").attr("fill", b => b.taxiid === d.taxiid ? "#e040fb" : "#6a1b9a");
                        if (window.filterMapAndScatterByTaxi) window.filterMapAndScatterByTaxi(d.taxiid);
                    }
                });

            window.clearBarHighlight = function() {
                window.barChartSelectedTaxi = null;
                d3.selectAll(".bar").attr("fill", "#6a1b9a");
            };
        }

        // Initial draw (all trips)
        drawBarChart(window.rawTrips);

        // Time slider filter support
        window.filterBarByHour = function(hour) {
            const filteredTrips = window.rawTrips.filter(f => {
                if (!f.properties.starttime) return false;
                return new Date(f.properties.starttime).getHours() === hour;
            });
            drawBarChart(filteredTrips);
        };
    });