fetch('https://raw.githubusercontent.com/tbellegue/CSC571-FinalProject/master/trips.json')
    .then(response => response.json())
    .then(data => {
        window.rawTrips = data.features;

        function drawBarChart(trips, selectedTaxiId = null) {
            console.log("drawBarChart called, trips:", trips.length, "selectedTaxiId:", selectedTaxiId);
            d3.select("#bar").selectAll("*").remove();

            // Count trips per taxi
            const taxiCounts = d3.rollup(
                trips,
                v => v.length,
                f => f.properties.taxiid
            );
            const taxiCountsArr = Array.from(taxiCounts, ([taxiid, count]) => ({ taxiid, count }));
            taxiCountsArr.sort((a, b) => d3.descending(a.count, b.count));
            const topN = 20;
            const topTaxiCounts = taxiCountsArr.slice(0, topN);

            const margin = { top: 40, right: 40, bottom: 80, left: 70 },
                width = 800 - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            const svg = d3.select("#bar")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand()
                .domain(topTaxiCounts.map(d => d.taxiid))
                .range([0, width])
                .padding(0.2);

            const maxCount = d3.max(topTaxiCounts, d => d.count) || 1;
            const y = d3.scaleLinear()
                .domain([0, maxCount])
                .nice()
                .range([height, 0]);

            // Y grid lines
            svg.append("g")
                .attr("class", "grid")
                .call(d3.axisLeft(y)
                    .tickSize(-width)
                    .tickFormat("")
                )
                .selectAll("line")
                .attr("stroke", "#f0f0f0");

            // X axis
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            // Y axis
            svg.append("g")
                .call(d3.axisLeft(y));

            // Bars
            svg.selectAll(".bar")
                .data(topTaxiCounts)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.taxiid))
                .attr("y", d => y(d.count))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.count))
                .attr("fill", d => selectedTaxiId === d.taxiid ? "#e040fb" : "#6a1b9a")
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    d3.select(this).attr("fill", "#e040fb");
                    let tooltip = d3.select("body").select(".d3-tooltip");
                    if (tooltip.empty()) {
                        tooltip = d3.select("body")
                            .append("div")
                            .attr("class", "d3-tooltip");
                    }
                    tooltip.transition().duration(150).style("opacity", 1);
                    tooltip.html(
                        `<strong>Taxi ID:</strong> ${d.taxiid}<br/>
                         <strong>Trips:</strong> ${d.count}`
                    )
                        .style("left", (event.pageX + 12) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mousemove", function (event) {
                    d3.select("body").select(".d3-tooltip")
                        .style("left", (event.pageX + 12) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function (event, d) {
                    d3.select(this).attr("fill", selectedTaxiId === d.taxiid ? "#e040fb" : "#6a1b9a");
                    d3.select("body").select(".d3-tooltip").transition().duration(150).style("opacity", 0);
                })
                .on("click", function (event, d) {
                    if (window.barChartSelectedTaxi === d.taxiid) {
                        window.barChartSelectedTaxi = null;
                        drawBarChart(trips, null);
                        if (window.clearMapAndScatterForBar) window.clearMapAndScatterForBar();
                    } else {
                        window.barChartSelectedTaxi = d.taxiid;
                        drawBarChart(trips, d.taxiid);
                        if (window.filterMapAndScatterByTaxi) window.filterMapAndScatterByTaxi(d.taxiid);
                    }
                });

            // X axis label
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 70)
                .attr("text-anchor", "middle")
                .text("Taxi ID");

            // Y axis label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("text-anchor", "middle")
                .text("Number of Trips");
        }

        // Initial draw
        drawBarChart(window.rawTrips);

        // Filtering functions for cross-chart interaction
        window.filterBarByHour = function (hour) {
            const filteredTrips = window.rawTrips.filter(f => {
                if (!f.properties.starttime) return false;
                return new Date(f.properties.starttime).getHours() === hour;
            });
            drawBarChart(filteredTrips);
        };

        window.filterBarByDuration = function (minSec, maxSec) {
            const filteredTrips = window.rawTrips.filter(f => {
                const dur = +f.properties.duration;
                return dur >= minSec && dur < maxSec;
            });
            drawBarChart(filteredTrips);
        };

        window.clearBarHighlight = function () {
            console.log("clearBarHighlight called, trips:", window.rawTrips ? window.rawTrips.length : "undefined");
            window.barChartSelectedTaxi = null;
            drawBarChart(window.rawTrips);
        };
    });