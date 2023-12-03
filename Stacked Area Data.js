let year = 2014,
        barPadding = 0.3;
        let focusState = false, previousTriangleState = null;
        let tooltipData, index;  
        let pastSales;
        let cat, // for category vlaue
         percentageTag, percentageTagCircle, percentageInfo;



        d3.json("Stacked Area Data.json", d3.autoType).then(AreaChart); 
        
        function AreaChart(dataset) {

            //-------------------------------------------
            //                  Functions
            //-------------------------------------------

            // For rounding up Max value to create a nice effect on gridlines
            // Function to round up to 2 significant figures
            function round(num) {
                // extract the length of number
                let num_length = Math.ceil(num).toString().length
                power = '1'
                for(let i = 0; i < num_length - 2; i++){
                    power = power + '0'
                }
                power = 10 ** (num_length - 2)
                return Math.ceil(num /power) * power

            }

            // Function to round number uo by a specified multiple
            function round2(number,multiple){
                let newNum = Math.round(number/multiple) * multiple;
                if (Math.abs(newNum) < Math.abs(number)){
                    // if number is positive
                    if(newNum > 0){
                    return newNum + multiple
                    }
                    // if number is negative
                    else{
                        return newNum - multiple
                    }
                }
                else{
                    return newNum
                }
            }

            // Function for info text change transition
            function textChange(textVariable, text){
                textVariable.transition()
                            .duration(500)
                            .style('opacity', 0)
                            .transition()
                            .duration(500)
                            .text(text)
                            .style('opacity', 1)
            }

            // The Triangle Animation Functions

            // For Negative Triangle
            function animateTriangleCW(item){

                // Create a function for clockwise rotation on center
                function rotateCW (x, y) {
                    return d3.interpolateString('rotate(0,'+x+','+y+')', 'rotate(180,'+x+','+y+')')
                }

                percentageGrowthIndicator
                    .transition()
                    .duration(1000)
                    .attrTween('transform' , function(d,i,a){ return rotateCW(1,0.000005)} )
                    .style('fill','red')
                    // on interruption
                    .on("interrupt", function() {
                        percentageGrowthIndicator
                    .attr('transform','rotate(180,'+1+','+0.000005+')')
                });
                

            }

            // For Positive Triangle
            function animateTriangleACW(){

                // Create a function for clockwise rotation on center
                function rotateACW (x, y) {
                    return d3.interpolateString('rotate(180,'+x+','+y+')', 'rotate(0,'+x+','+y+')')
                }

                percentageGrowthIndicator
                    .transition()
                    .duration(1000) 
                    .attrTween('transform' , function(d,i,a){ return rotateACW(1,0.000005)} )
                    .style('fill',function(){
                        if(year == years[0]){
                            return 'grey'
                        }else{
                            return 'green'
                        }
                    })
                    // on interruption
                    .on("interrupt", function() {
                        percentageGrowthIndicator
                    .attr('transform','rotate(0,'+1+','+0.000005+')')
                });  

            }

            // Animate line
            function animateLine(line){
                    let lineLength = line.node().getTotalLength();
                    line.attr("stroke-dasharray", lineLength + " " + lineLength)
                        .attr("stroke-dashoffset", lineLength)
                        .transition().ease(d3.easeLinear).duration(1000)
                        .attr("stroke-dashoffset", 0)
            }

            console.log("dataSet =", dataset)

            //---------------------------------------------------
            //                 Data Preparation
            //---------------------------------------------------
            // Filtering starts here

            let monthlyMax = d3.max(dataset, function(d){return d.Sales})

            console.log('Monthly maximum =', monthlyMax)


            // -----------------------------------------------
            //  Defining Max and Min for Profit Margin
            // -----------------------------------------------


            let maxProfitMargin = d3.max(dataset, function(d){return d.ProfitMargin})

            let minProfitMargin = d3.min(dataset, function(d){return d.ProfitMargin})

            // filtered by year
            let dataSet = dataset.filter(function(e) {return e.Year == year});

            // Array of years
            const years = Array.from(new Set(d3.map(dataset, function(d) {return d.Year})));

            console.log(years)

            // To group by
            const group_by = 'Category'

            // Grouped by category
            let nested = Array.from(d3.group(dataSet, d => d[group_by]), ([key, value]) => ({key,value}))

            console.log(`Nested by ${group_by} =`, nested)  //dataset nested by group_by

            // Array of months
            const months = d3.map(nested[0].value, function(d){ return d.Month});

            console.log('Months =', months ) //Months

            // Array of categories
            const categories = d3.map(nested, function(d){ return d.key });  //
        
            console.log("Categories = ", categories)  // Categories

            // Nested data for area chart
            let data = d3.map(nested, function(d){ return d.value});

            console.log('Data =', data) // Array of 3 arrays of 12 dictionaries per month

            // Stacked sales max
            const Sales_max_stacked = d3.max(dataset.map(function(d){return (d["Stackedmax"]);}))

            console.log(Sales_max_stacked)
            
            // Using D3 to append year menu
            let menu = d3.select('#yearMenu')
            menu.selectAll('option')
                  .data(years)
                  .enter()
                  .append('option')
                  .attr('value', function(d) {return d})
                  .text(function(d){return d})
            

            // Event on year menu
            menu.on("change", function (event) {
            
                year = this.value; //getting selected year
                
                console.log(year)

                if(focusState == false){
                    updateAreaChart(year)
                }else{
                    oneCategory(cat, year)
                }
                clearInterval(playInterval)
                play.classed('playselected', false)
            });

            let yearMenu = document.getElementById("yearMenu")

            const play = d3.select('#playYearsButton')

            const BackButton = d3.select('#BackButton')
            

             // ---------------------------------
            //          Y AXIS FORMAT
            // ---------------------------------
            
            let yAxisFormat = function(d) {return d < 10000? d3.format('$.1s')(d): d3.format('$.2s')(d);}
            
            const yMax = round(Sales_max_stacked)


            //----------------------------------------
            //               Needed Dimensions
            //----------------------------------------
            const width = 1040;
            const height = 600; 
            const lmargin = 50; 
            const rmargin = 170; 
            const tmargin = 20;  
            const bmargin = 50;
            const plotWidth = width - lmargin - rmargin;
            const plotHeight = height - tmargin - bmargin;


            //Creating SVG Viewport for Graph
            const svg = d3
                            .select('#areaChart')
                            .append('svg')
                            .attr('width', width)
                            .attr('height', height)

            // Graph Group
            const graphGroup =
                svg.append('g')
                    .attr('id', 'graphGroup');
                            

            // Adding tooltip div
            let tooltip = d3 
                            .select('#areaChart')
                            .append("div")
                            .attr("class", "tooltip")
                            .style("opacity", 0);         /// non visible


            //-----------------------------------------------
            //           Create ALL Scales Neccessary
            //-----------------------------------------------

            // xscale
            const xScale =
                d3.scaleBand()         
                    .domain(months)                              
                    .range([lmargin, width - rmargin])
           
            // yscale
            const yScale =
                d3.scaleLinear()                      
                    .domain([0, yMax])
                    .range([height - bmargin, tmargin]);
                    
            // yScale for Bar Chart
            const yScaleBar =
                d3.scaleLinear()                      
                    .domain([0, round(monthlyMax)])
                    .range([height - bmargin, tmargin])

            // Scale for Profit Margin Line
            const yScaleProfitMargin =
                    d3.scaleLinear()                      
                        .domain([round2(minProfitMargin, 0.5), round2(maxProfitMargin, 0.5)])
                        .range([height - bmargin, tmargin])

            // Scale for info boxes
            const yScaleInfo =
                d3.scaleBand()                      
                    .domain(['Year Total Sales Revenue','% Growth', 'Year Profit Margin', 'Overall Profit Margin'])
                    .range([tmargin + 110, height - bmargin])
                    .padding(0.1)
                    .paddingOuter(0);

        
            //-----------------------------------------
            //                  Color Scale
            //-----------------------------------------

            const catColorScheme = d3.scaleOrdinal()
                                  //.domain(categories.sort())
                                  .domain(['Furniture', 'Office Supplies', 'Technology'])
                                  .range(['brown','orange','dodgerblue'])

            // ------------------------------------------------------
            //                  Creation of AreaChart on Entry
            // ------------------------------------------------------
            // AREA GRAPH
            const areagraph = 
                graphGroup.selectAll('path.sales-data')                                    
                .data(data)
                .enter()
                    .append('path')
                    .attr('transform', `translate(${xScale.bandwidth() * 0.5}, ${0})`)      
                    .attr('class', 'sales-data areagraph')                                        
                    .attr('stroke', 'black')
                    .attr('stroke-width', 1.2) //3
                    .attr('fill', function(d, i) {return catColorScheme(d[0].Category) })
                    .attr('class', function(d) {return d[0].Category == "Office Supplies"? "Office_Supplies" : d[0].Category})
                    .classed('areagraph', true)
                    .classed('button', true)
                    .style("opacity", 0.7)
                    .attr('d', 
                    
                        d3.area()                                                           
                            .x(function(d, i) {                                             
                                return xScale(d.Month)
                            })
                            .y0(function(d, i) {
                                return yScale(d['Stackedmin'])
                            })
                            .y1(function(d, i) {
                                return yScale(d['Stackedmax'])
                            })            
                    );
    
            //----------------------------------------------
            //                  Axes for the graph
            //----------------------------------------------

            //Choose a bottom axis type for our x-axis
            const xAxis = d3.axisBottom(xScale).tickSizeOuter([0])

            //Choose a left axis type for our y-axis
            const yAxis = d3.axisLeft(yScale).tickFormat(yAxisFormat)
            
            /// For Bar Charts
            const yAxisBar = d3.axisLeft(yScaleBar).tickFormat(yAxisFormat)

            // Profit Margin
            const yAxisProfitMargin = d3.axisRight(yScaleProfitMargin).tickFormat(d3.format(".0%")).ticks(5).tickSize([3])



            // Render the Axes in groups in the graphGroup
            // For Xaxis
            const xAxisGroup = 
                                    svg.append('g')
                                        .attr('transform', `translate(${0}, ${height - bmargin})`)
                                        .call(xAxis)

            // For Yaxis                           
            const yAxisGroup = 
                                    svg.append('g')
                                        .attr('id', 'y-axis')
                                        .attr('transform', `translate(${lmargin}, ${0})`)
                                        .call(yAxis)
       
            
            // For Yaxis2                           
            const yAxisGroup2 = 
                                    svg.append('g')
                                        .attr('id', 'y-axis2')
                                        .attr('transform', `translate(${lmargin + plotWidth}, ${0})`)
            

            //Gridlines
            function gridlines(){

                const verticalLines =
                                graphGroup
                                    .append('g')
                                    .attr('transform', `translate(${xScale.bandwidth() * 0.5}, ${0})`)      
                                    .selectAll('line.grid-vertical-line')
                                    .data(months)
                                    .enter()
                                        .append('line')
                                            .attr('class', 'grid-vertical-line gridline')
                                            .attr('x1', xScale)
                                            .attr('y1', yScale(0))
                                            .attr('x2', xScale)
                                            .attr('y2', yScale(yMax))
                                            .style('stroke', 'gray')
                                            .style('stroke-width', 1)
                                            .style('opacity', '0.25');                       
    
                
                const horizontalLines =
                                graphGroup
                                    .append('g')
                                    .attr('transform', `translate(${xScale.bandwidth() * 0.5}, ${0})`)       
                                    .selectAll('line.grid-horizontal-line')
                                    .data(yAxis.scale().ticks(12))
                                    .enter()
                                        .append('line')
                                            .attr('class', 'grid-horizontal-line gridline')
                                            .attr('x1', lmargin)
                                            .attr('y1', yScale)
                                            .attr('x2', width - rmargin - xScale.bandwidth())
                                            .attr('y2', yScale)
                                            .style('stroke', 'gray')
                                            .style('stroke-width', 1)
                                            .style('opacity', '0.25');
            }

            // Create gridlines
            gridlines()
            
            //-----------------------------------------------------------
            //                          Axis Titles
            //-----------------------------------------------------------

            // Add a title to the x-axis
            xAxisGroup
            .append('text')
            .text('Months')
            .attr('y', bmargin/2 + 10) 
            .attr('x', width/2)
            .style('fill', 'black')
            .attr('font-size', 14)
            .attr('text-anchor', 'middle');


            // Add a title to the y-axis
            yAxisGroup.append('text')
            .text('Sales')
            .attr('y', -lmargin/1.4) 
            .attr('x', -(tmargin + plotHeight/2))
            .attr('transform', 'rotate(270)')
            .style('fill', 'black')
            .attr('font-size', 14)
            .attr('text-anchor', 'middle');

            // ---------------------------------------------------
            //          Information on Right Margin
            // ---------------------------------------------------
                  
            // Create a group to contain all groups
            let infoGroup = svg.append('g').attr('transform', `translate(50)` )
                                            .attr('transform', `translate(${plotWidth + lmargin})` )

            //-----------------------------------------
            //                Legend
            //-----------------------------------------
            const legendGroup = 
                                infoGroup.append('g')
                                .attr('id', 'legend-group')
                                .attr("transform", `translate(${35},${tmargin + 20})`);

            // Shape of Catgeory legend
            let starlegend = d3.symbol().type(d3.symbolStar)

            // Create Category Legend
            let legend =
                        legendGroup.append('g')
                                    .attr('id', 'colorLegend')
                                    .selectAll('path')
                                    .data(catColorScheme.domain())
                                    .enter()
                                    .append('path')
                                    .attr('d', starlegend.size(150))
                                    .attr('fill', catColorScheme)
                                    .attr('transform', (d,i) => `translate(0,${i * 35 - 20})`)
                                    .attr('class', function(d){ return `legend ${d.replace(' ', '_')}` })

            // Catgeory legend Text
            let legendText = legendGroup.selectAll('text')
                                        .data(catColorScheme.domain())
                                        .enter().append('text')
                                        .text(d => d)
                                        .attr('class', function(d){ return `legend ${d.replace(' ', '_')}` })
                                        .classed('button', true)
                                        .attr('fill', catColorScheme)
                                        .attr('transform', (d,i) => `translate( 15 ,${i * 35 - 20})`)
                                        .attr('dy', '.35em')


            // Append info boxes
            infoGroup.selectAll('rect')
                        .data(yScaleInfo.domain())
                        .enter()
                        .append('rect')
                        .attr('width', rmargin - 27)
                            .attr('height', yScaleInfo.bandwidth())
                            .attr('fill', 'none')
                            .attr('stroke', 'black')
                            .attr("transform", "translate(" +(27)+")")
                            .attr("y", function (d) {return yScaleInfo(d);})
                        

            // ------------------------------------------------
            // This will need to change once i implement d3.stack
            //---------------------------------------------------
            
            // Total sales Revenue for the year
            let yearlySalesTotal = d3.sum(dataSet, function(d){return d.Sales});

            console.log(yearlySalesTotal)

            const totalSalesText = 
                    infoGroup.append('text')
                                .text('Yearly Revenue')
                                .attr('class', 'info')
                                .attr('y', 165)
                                .attr('transform', `translate(${rmargin/2 + 27/2})`)
                                .attr('text-anchor', 'middle')

            const totalSalesValue = 
                                infoGroup.append('text')
                                            .text(`${d3.format("$,")(yearlySalesTotal)}`)
                                            .attr('class', 'info')
                                            .attr('y', 195)
                                            .attr('transform', `translate(${rmargin/2 + 27/2})`)
                                            .attr('text-anchor', 'middle')
                                            .attr('font-size', 22)


            console.log(d3.sum(data[0], function(d){return d.Stackedmax}))

            ///////////////////////////////////////////////////

            let percentageGrowthCardText = infoGroup.append('text')
                                                .text('%Yearly Growth')
                                                .attr('class', 'info')
                                                .attr('y', 273)
                                                .attr('transform', `translate(${rmargin/2 + 27/2})`)
                                                .attr('text-anchor', 'middle')
                                               

                                
            let percentageGrowthCardValue = infoGroup.append('text')
                                                .text(`--%`)
                                                .attr('class', 'info')
                                                .attr('y', 308)
                                                .attr('transform', `translate(${rmargin/2 + 27/2 + 10})`)
                                                .attr('text-anchor', 'middle')
                                                .attr('font-size', 25)

            const trianglePath = d3.symbol().type(d3.symbolTriangle).size(150)

            let percentageGrowthIndicator  = infoGroup.append('g').attr('transform', `translate(75, 300)`)
                                                                    .append('g').attr('id', 'indicator')
                                                                    .append('path')
                                                                        .attr('d', trianglePath)
                                                                        .style("fill", 'darkgrey');


            ///////////////////////////////////////////////////

            let dataforyear = dataset.filter(function(d){return d.Year == year});
            let profitmarginValue = d3.sum(dataforyear, function(d){return d.Profit})/yearlySalesTotal * 100

            console.log(profitmarginValue)



            let profitMarginCardText = infoGroup.append('text')
                                                .text('Year Profit Margin')
                                                .attr('class', 'info')
                                                .attr('y', 383)
                                                .attr('transform', `translate(${rmargin/2 + 27/2})`)
                                                .attr('text-anchor', 'middle')
                               

                                
            let profitMarginCardValue = infoGroup.append('text')
                                                .text(`${profitmarginValue.toFixed(2)}%`)
                                                .attr('class', 'info')
                                                .attr('y', 418)
                                                .attr('transform', `translate(${rmargin/2 + 27/2})`)
                                                .attr('text-anchor', 'middle')
                                                .attr('font-size', 25)

            
            let overallProfitmarginValue = d3.sum(dataset, function(d){return d.Profit})/d3.sum(dataset, function(d){return d.Sales}) * 100

            console.log(overallProfitmarginValue)



            let overallProfitMarginCardText = infoGroup.append('g')
                                                        .selectAll('text')
                                                        .data([`${years[0]} - ${years[years.length - 1]}`,'Profit Margin'])
                                                        .enter()
                                                        .append('text')
                                                            .text(function(d){return d})
                                                            .attr('class', 'info')
                                                            .attr('y', 485)
                                                            .attr('y', function(d,i){return 478 + i * 15})
                                                            .attr('transform', `translate(${rmargin/2 + 27/2})`)
                                                            .attr('text-anchor', 'middle')
                                            
                    
                                
            let overallProfitMarginCardValue = infoGroup.append('text')
                                                .text(`${overallProfitmarginValue.toFixed(2)}%`)
                                                .attr('class', 'info')
                                                .attr('y', 525)
                                                .attr('transform', `translate(${rmargin/2 + 27/2})`)
                                                .attr('text-anchor', 'middle')
                                                .attr('font-size', 25)


            
            // ----------------------------------------------------------
            //                  Tooltip line creation
            // ----------------------------------------------------------

            // Tool tip ruleline

            // Append tooltip group
            const rulelinegroup = svg.append("g");

            //vertical line tool tip
            const ruleline = rulelinegroup.selectAll('line')
                                            .data(dataSet)
                                            .enter()
                                            .append("line")
                                            .attr("y1", tmargin)
                                            .attr("y2", height - bmargin)
                                            .attr("x1", lmargin + xScale.bandwidth() * 0.5)
                                            .attr("x2", lmargin + xScale.bandwidth() * 0.5)
                                            .attr("stroke", "currentColor")
                                            .attr("opacity", 0)
            
            /////////////////////////
            // attempt to select percentages for the years
            let percentages = d3.map(data, function(array){ return d3.sum(array, function(d) { return d.Sales})})

            console.log(percentages)

            function applyEventAreaChart() {

            // ADDING SOME BASIC INTERACTION
            d3.selectAll('.areagraph')
            .on(
                'mouseenter',
                function(event, d) {
                    const thisPath = d3.select(this);
                    d3.selectAll('.areagraph').style('opacity', 0.3)
                    thisPath.style("opacity", 1);
                    thisPathCat = d[0].Category
                    console.log(thisPathCat)
                    d3.selectAll(`.${thisPath.attr('class')}`).classed('focus', true); 

                    console.log(d[10])

                    let revenueTotalperCat = d3.sum(d, function(data){ return data.Sales})

                    console.log(revenueTotalperCat)

                    percentageInfo = graphGroup.append('text')
                                                .text(`%GT ${thisPathCat}: ${d3.format('.0%')(revenueTotalperCat/yearlySalesTotal)}`)
                                                .attr('y', yScale(115000) + 10)
                                                .attr('x', lmargin + xScale.bandwidth() * 0.5 + 10)
                                                .style('font-size', 30)
                }
            )
            .on(
                "mouseleave",
                function(event) {
                    const thisPath = d3.select(this);
                    d3.selectAll('.areagraph').style('opacity', 0.7);
                    percentageInfo.remove()
                }
            )
            .on(
                "click", 
                function(event) {
                    const thisPath = d3.select(this);
                    // Save Category
                    cat = thisPath.data()[0][0].Category
                    // interrupt play all
                    clearInterval(playInterval)
                    play.classed('playselected', false)
                    // Remove previous bars for now
                    graphGroup.html('')
                    // Event on legend
                    d3.selectAll('.legend').style('opacity', 0.3)
                    d3.selectAll(`.${cat.replace(' ', '_')}`).style('opacity', 1)
                    // 
                    oneCategory(cat, year, entry = true)
                    // Update AllYearProfitMargin for Category
                    let catDataAllYear = dataset.filter(function(d){return d.Category == cat})
                    overallProfitmarginValue = d3.sum(catDataAllYear, function(d){return d.Profit})/d3.sum(catDataAllYear, function(d){return d.Sales}) * 100

                    // Change Overall Profit margin Value
                    textChange(overallProfitMarginCardValue, `${overallProfitmarginValue.toFixed(2)}%`)
                }
            );
            }

            applyEventAreaChart()

            //-------------------------------------------------
            //       For tooltip on hover
            //-------------------------------------------------

           function tooltipGraphGroup(){
            graphGroup
            .on(
                "pointermove",
                function(event) {
                    let mouseX = d3.pointer(event)[0] - lmargin - Math.ceil(xScale.step() * 0.5 + 1 )
                    if(mouseX % Math.round(xScale.step()) == 0 ){
                        if(focusState == false){
                        index = mouseX/Math.round(xScale.step())
                        ruleline.transition().duration(300).attr("opacity", 1)
                        ruleline.attr("transform", `translate(${mouseX/xScale.bandwidth() * xScale.bandwidth() + 1} ,0)`);
                        tooltipData = d3.map(data, function(d){ return d[index]})
                        let timeTotalRevenue = d3.sum(tooltipData, function(d){return d.Sales})
                        // Remove Old tooltip

                        tooltip
                                .style("visibility", "none")
                                .style("opacity", 0);


                        tooltip.transition().duration(300).style("opacity", 0.8); //showing tooltip  
                        tooltip.html(
                                `<span style="font-weight:bold"> ${data[0][index].Month} ${data[0][index].Year} <br></span>
                                <span style="font-weight:bold"> Total Revenue: ${d3.format("$,")(timeTotalRevenue)} </br> </span>
                                <span style="color: ${catColorScheme(tooltipData[0].Category)}"> ${tooltipData[0].Category}: </span>${d3.format("$,")(tooltipData[0].Sales)} (${d3.format(".0%")(tooltipData[0].Sales/timeTotalRevenue)}) <br></span>
                                <span style="color: ${catColorScheme(tooltipData[1].Category)}"> ${tooltipData[1].Category}: </span>${d3.format("$,")(tooltipData[1].Sales)} (${d3.format(".0%")(tooltipData[1].Sales/timeTotalRevenue)}) <br></span>
                                <span style="color: ${catColorScheme(tooltipData[2].Category)}"> ${tooltipData[2].Category}: </span>${d3.format("$,")(tooltipData[2].Sales)} (${d3.format(".0%")(tooltipData[2].Sales/timeTotalRevenue)}) <br></span>`
                                ) 

                            .style("visibility", "visible") //adding values on tooltip
                            .style("left", event.x + "px") //for getting the horizontal or x position of cursor and giving it to tooltip
                            //.style("top", event.pageY + "px"); //for getting y value of cursor and giving it to tooltip
                            .style("bottom", (window.innerHeight - event.y ) + "px"); //for getting y value of cursor and giving it to tooltip
                        }
                    }

                })
                .on(
                "mouseleave",
                function(event) {
                    // Remove tooltip and ruleline
                    ruleline.transition()
                            .duration(301)
                            .attr("opacity", 0)
                    tooltip
                            .style("visibility", "none")
                            .transition()
                            .duration(301)
                            .style("opacity", 0);     
                })
            }

            // Apply event on graphgroup
            tooltipGraphGroup()


            legendText
            .on('click', function(event){
                const thisLegend = d3.select(this);
                const thisLegendCat = thisLegend.text().replace(' ', '_')
                //console.log(thisLegendCat)
                d3.selectAll('.legend').style('opacity', 0.3)
                d3.selectAll(`.${thisLegendCat}`).style('opacity', 1)
                // stop previous animation
                clearInterval(playInterval)
                play.classed('playselected', false)
                // only if selected category is not currently already selected
                if(cat != thisLegend.text()){
                    cat = thisLegend.text()
                    // then change bar
                    if(focusState == false){
                        oneCategory(cat, year, entry = true)
                    }else{
                        oneCategory(cat, year)
                    }
                }
                if(focusState == true){
                    // Update AllYearProfitMargin for Category
                    let catDataAllYear = dataset.filter(function(d){return d.Category == cat})
                    overallProfitmarginValue = d3.sum(catDataAllYear, function(d){return d.Profit})/d3.sum(catDataAllYear   , function(d){return d.Sales}) * 100

                    // Change Overall Profit margin Value
                    textChange(overallProfitMarginCardValue, `${overallProfitmarginValue.toFixed(2)}%`)
                }

            })


            let playInterval;


            play.on('click', function(event){
                clearInterval(playInterval);
                play.classed('playselected', false);
                playYears();
            });
     

            BackButton.on('click', function(event){
                cat = null;
                updateAreaChart(year, entry = true)
                clearInterval(playInterval);
                play.classed('playselected', false)
                d3.selectAll('.secondYaxis').remove()
                // Move Infogroup and increase svg to accomodate profit margin axis
                infoGroup.transition().duration(500).attr('transform', `translate(${plotWidth + lmargin})` )
                svg.transition().duration(500).attr('width', width)
            })


            function playYears() {
                play.classed('playselected', true)
                let i;
                //if(d3.select('.selected').text() == 2014) {
                if(year == years[0]){
                    i = 2;
                    if(focusState != true){
                        updateAreaChart(years[1]);
                        }
                    else{
                        oneCategory(cat, years[1])
                    }
                }
                else {
                    //i = 0;
                    // Added to stop the delay
                    i = 1;
                    if(focusState != true){
                        updateAreaChart(years[0]);
                        }
                    else{
                        oneCategory(cat, years[0])
                    }
                    
                }

                playInterval = setInterval(function() {
                    if(focusState != true){
                        updateAreaChart(years[i]);
                        }
                    else{
                        oneCategory(cat, years[i])
                    }
                    //updateAreaChart(years[i]);
                    i++

                    if(i > years.length - 1) {
                        clearInterval(playInterval);
                        play.classed('playselected', false)
                    }
                }, 2500); 
                
            }
            



            //----------------------------------------------
            //       Functions for filtering the data
            //----------------------------------------------

            function updateAreaChart(updateYear, entry = false) {

                year = updateYear;
                yearMenu.value = year;
                focusState = false;

                // Remove profit margin legend
                d3.selectAll('.profitmarginlegend').remove()
                
                // filter data again for the year
                dataSet = dataset.filter(function(element) {return element.Year == updateYear});

                nested = Array.from(d3.group(dataSet, d => d[group_by]), ([key, value]) => ({key,value}));

                data = d3.map(nested, function(d){ return d.value});

                if(entry == true){
                    d3.select('#BackButton').style('visibility', 'hidden')
                    d3.selectAll('.legend').style('opacity', 1)
                    
                    barChart.remove()
                    d3.selectAll('.profitMargin').remove()

                    // Remove Previous ref line
                    d3.select('.profitMarginRefLine').remove()

                    overallProfitmarginValue = d3.sum(dataset, function(d){return d.Profit})/d3.sum(dataset, function(d){return d.Sales}) * 100


                    // Change Overall Profit margin Value
                    textChange(overallProfitMarginCardValue, `${overallProfitmarginValue.toFixed(2)}%`)

                    // Change padding of bar chart
                    xScale.padding(0).paddingOuter(0)

                }
                
                //--------------------------------------------
                //          Update the info cards
                //--------------------------------------------

                
                profitmarginValue = d3.sum(dataSet, function(d){return d.Profit})/d3.sum(dataSet, function(d){return d.Sales}) * 100

                console.log(profitmarginValue)

                // Change profit margin card value     
                textChange(profitMarginCardValue, `${profitmarginValue.toFixed(2)}%`)
               

                d3.selectAll('.areagraph')
                            .data(data, d=> d[0].Category)
                            .join(
                                        enter => {graphGroup.selectAll('path')
                                                            .data(data, d=> d[0].Category)
                                                            .enter()
                                                            .append('path')
                                                                .attr('transform', `translate(${xScale.bandwidth() * 0.5}, ${0})`)      
                                                                .attr('class', 'sales-data areagraph')                                        
                                                                .attr('stroke', 'black')
                                                                .attr('stroke-width', 1.2)
                                                                .attr('fill', function(d, i) {return catColorScheme(d[0].Category) })
                                                                .attr('class', function(d) {return d[0].Category == "Office Supplies"? "Office_Supplies" : d[0].Category})
                                                                .classed('areagraph', true)
                                                                .classed('button', true)
                                                                .style("opacity", 0.7)
                                                                .attr('d', 
                                                                
                                                                    d3.area()                                                           
                                                                        .x(function(d, i) {                                             
                                                                            return xScale(d.Month)
                                                                        })
                                                                        .y0(function(d, i) {
                                                                            return yScale(d['Stackedmin'])
                                                                        })
                                                                        .y1(function(d, i) {
                                                                            return yScale(d['Stackedmax'])
                                                                        })            
                                                                )
                                                            }
                                                        
                                                        ,
                                        update => update
                                                        .transition()
                                                        .duration(1500)
                                                        .attr('d',
                                                            d3.area()                                                           
                                                                .x(function(d, i) {                                             
                                                                    return xScale(d.Month)
                                                                })
                                                                .y0(function(d, i) {
                                                                    return yScale(d['Stackedmin'])
                                                                })
                                                                .y1(function(d, i) {
                                                                    return yScale(d['Stackedmax'])
                                                                }))   
                                                                                            
                                                                        );

                if(entry == true){
                        applyEventAreaChart()
                        gridlines()
                        tooltipGraphGroup()
                }   

                //----------------------------------------------------------------
                //                      Previous Data Information
                //----------------------------------------------------------------
                let prevdataSet = dataset.filter(function(element) {return element.Year == updateYear - 1});

                let previousTotalSales = d3.sum(prevdataSet, function(d){return d.Sales});

                let previousTotalProfit = d3.sum(prevdataSet, function(d){return d.Profit});

                console.log(data[0])

                yearlySalesTotal = d3.sum(data[0], function(d){return d.Stackedmax});

                textChange(totalSalesValue,`${d3.format("$,")(yearlySalesTotal)}`)
            
                yAxisGroup.call(yAxis)

                let totalSales = d3.sum(dataSet, function(d){return d.Sales});

                let percentageGrowth 

                // Percentage Growth
                if(year != years[0]){
                    // adjust triangle
                    d3.select('#indicator').transition().duration(750).attr('transform', 'translate(-20)')
                    percentageGrowth = (totalSales - previousTotalSales)/previousTotalSales * 100
                    console.log(percentageGrowth)
                }else{
                    d3.select('#indicator').transition().duration(750).attr('transform', 'translate(0)')
                }

                // Change Value for Yearly Percentage Growth
                percentageGrowthCardValue
                        .transition()
                        .duration(500)
                        .style('opacity',0)
                        .transition()
                        .duration(500)
                        .style('opacity', 1)
                        .text(function(){
                            if(year == years[0]){
                                return '--%'
                            }else{
                                return `${Math.abs(percentageGrowth).toFixed(2)}%`
                            }
                        }).style('fill', function(){return year == years[0]? 'black': percentageGrowth > 0? 'green': 'red' })

                
                if(year == 2014 && previousTriangleState == false){
                    // rotate triangle and change color
                        animateTriangleACW()
                        previousTriangleState = null;
                    }
                else if(year == 2014 && previousTriangleState != false){
                    percentageGrowthIndicator.transition().duration(1000).style('fill', 'grey')
                    previousTriangleState = null;
                }
                else{
                    if(previousTriangleState == false && percentageGrowth > 0){
                        animateTriangleACW()
                        previousTriangleState = true;
                    }
                    if(previousTriangleState != false && percentageGrowth < 0){
                        // Animate triangle back
                        animateTriangleCW()  
                        previousTriangleState = false;  
                    }
                }
            };

    
            function oneCategory(category, updateYear, entry = false){

                year = updateYear;
                yearMenu.value = year;

                if(entry == true){
                     // Move Infogroup and increase svg to accomodate profit margin axis
                     infoGroup.transition().duration(500).attr('transform', `translate(${plotWidth + lmargin + 30})`);
                     svg.transition().duration(500).attr('width', width + 30);
                }

                // Turn on focusState to disable tooltip for areaChart
                focusState = true;

                // Remove area chart and gridlines
                d3.selectAll('.areagraph').remove()
                d3.selectAll('.gridline').remove()
                d3.selectAll('.profitMargin').remove()

                // Remove Previous ref line
                d3.select('.profitMarginRefLine').remove()

                //----------------------------------------------------------------
                //                      Previous Data Information
                //----------------------------------------------------------------
                
                let prevdataSet = dataset.filter(function(element) {return element.Year == updateYear - 1 && element.Category == category});
    
                let previousTotalSales = d3.sum(prevdataSet, function(d){return d.Sales});

                let previousTotalProfit = d3.sum(prevdataSet, function(d){return d.Profit});

                console.log(previousTotalSales)
                console.log(prevdataSet)
          

                // array for ProfitMarginLine
                let barChartData = dataset.filter(function(element) {return element.Year == updateYear && element.Category == category});
                let profitMarginArray = d3.map(barChartData, function(d){return d.ProfitMargin})
                console.log(profitMarginArray)

                console.log(barChartData)
                //////////////////////////////////////
                let categoryTotalSales = d3.sum(barChartData.map(function(d){return d.Sales}))

                console.log(categoryTotalSales)

                // Profit Margin Value for Category
                profitmarginValue = d3.sum(barChartData, function(d){return d.Profit})/categoryTotalSales * 100

                console.log(profitmarginValue)

                textChange(profitMarginCardValue, `${profitmarginValue.toFixed(2)}%`)
                
                let categoryPercentageGrowth

                // Percentage Growth
                if(year != years[0]){
                    // Adjust triangle
                    d3.select('#indicator').transition().duration(750).attr('transform', 'translate(-20)')
                    categoryPercentageGrowth = (categoryTotalSales - previousTotalSales)/previousTotalSales * 100
                    console.log(categoryPercentageGrowth)
                }else{
                    d3.select('#indicator').transition().duration(750).attr('transform', 'translate(0)')
                }

                if(year == years[0]){
                    percentageGrowthCardValue.text('--%').style('fill', 'black')
                }else{
                percentageGrowthCardValue
                            .transition()
                            .duration(500)
                            .style('opacity',0)
                            .transition()
                            .duration(500)
                            .style('opacity', 1)
                            .text(function(){
                                if(year == years[0]){
                                    return '--%'
                                }else{
                                    return `${Math.abs(categoryPercentageGrowth).toFixed(2)}%`
                                }
                            }).style('fill', function(){return year == years[0]? 'black': categoryPercentageGrowth > 0? 'green': 'red' })
                }
                
                

                // Added Transition to the y axis on change to barchart
                yAxisGroup.transition().duration(500).call(yAxisBar)

                // -------------------------------------------
                // When bar chart comes, there is a need to remove tooltip and line
                // -------------------------------------------
                ruleline.transition()
                            .duration(301)
                            .attr("opacity", 0)
                tooltip
                    .style("visibility", "none")
                    .transition()
                    .duration(301)
                    .style("opacity", 0);     

            
                xScale.padding(barPadding).paddingOuter(barPadding/2)

                // BarChart
                barChart = graphGroup
                                    .selectAll('rect')
                                    .data(barChartData)
                                    .join(
                                        enter => enter.append('rect')
                                                        .attr('class', function(d){return `barChart ${d.Month}`})
                                                        .attr('width',  xScale.bandwidth())
                                                        .attr('fill', function(d) {return catColorScheme(d.Category)})
                                                        .attr("x", function (d) {return xScale(d["Month"]);})
                                                        .attr("y", function (d) {return yScaleBar(0);})
                                                        .transition().duration(1000)
                                                        .attr('height', function(d){return yScaleBar(0) - yScaleBar(d.Sales)})
                                                        .attr("y", function (d) {return yScaleBar(d.Sales);})
                                                        ,
                                        update => update.transition().duration(1000)
                                                        .attr('height', function(d){return yScaleBar(0) - yScaleBar(d.Sales)})
                                                        .attr("y", function (d) {return yScaleBar(d.Sales);})
                                                        .attr('fill', function(d) {return catColorScheme(d.Category)})
                                                        
                                    );
          

                // Tooltip for Bar Chart
                barChart
                .on('mouseenter', function(event, d){
                    const thisPath = d3.select(this);
                    d3.selectAll('.barChart').style('opacity', 0.3);
                    d3.selectAll('.profitMargin').style('opacity', 0.3);
                    d3.selectAll(`.${d.Month}`).transition().duration(500).style("opacity", 1)
                    d3.select(`circle.${d.Month}`).attr("r", 8)
                    thisPath.style("opacity", 1);
                    console.log(d)
                    tooltip.transition().duration(300).style("opacity", 0.8); //showing tooltip  
                    tooltip.html(
                                `<span> ${d.Month} ${d.Year} <br></span>
                                <span> Total Sales: ${d3.format("$,")(d.Sales)}<br></span>
                                <span style="color:green;"> Profit Margin: ${d3.format(".0%")(d.Profit/d.Sales)}<br></span>`
                                ) 

                            .style("visibility", "visible") //adding values on tooltip
                            .style("left", event.pageX + "px") //for getting the horizontal or x position of cursor and giving it to tooltip
                            .style("bottom", (window.innerHeight - event.pageY ) + "px"); //for getting y value of cursor and giving it to tooltip

                })
                .on(
                "mouseleave",
                function(event, d) {
                    d3.selectAll('.barChart').style('opacity', 1);
                    d3.select(`circle.${d.Month}`).transition().duration(500).attr("r", 4)
                    d3.selectAll('.profitMargin').style('opacity', 1);
                    d3.selectAll('.profitMargin').raise()
                    setTimeout(()=>{d3.select(`circle.${d.Month}`).style('opacity', 1);}, 150)
                    tooltip
                            .style("visibility", "none")
                            .transition()
                            .duration(301)
                            .style("opacity", 0);   
                    refLine.raise()  
                })
                .on('pointermove', function(event){
                    tooltip.style("left", event.pageX + "px") //for getting the horizontal or x position of cursor and giving it to tooltip
                    .style("bottom", (window.innerHeight - event.pageY ) + "px"); //for getting y value of cursor and giving it to tooltip
                })

                
            // ------------------------------------------
            //          Create Profit Margin Line
            // ------------------------------------------
            const profitMarginLine = 
                                graphGroup.selectAll('path')                                    
                                        .data([barChartData])
                                        .enter()
                                        .append('path')
                                        .attr('transform', `translate(${xScale.bandwidth() * 0.5}, ${0})`)      
                                        .attr('class', 'profitMargin')                                        
                                        .attr('stroke', 'lime')
                                        .attr('stroke-width', 3)
                                        .attr('fill', 'none')
                                        .attr('d',
                                            d3.line()                                                           
                                                .x(function(d, i) {                                             
                                                    return xScale(d.Month)
                                                })
                                                .y(function(d, i) {
                                                    return yScaleProfitMargin(d['ProfitMargin'])
                                                })
                                        );
            // Raise Profit Margin Line                            
            profitMarginLine.raise();

            // Dots of profit Margin
            const profitMarginDots = 
                    graphGroup.append('g')
                            .selectAll('circle')                                    
                            .data(barChartData)
                            .enter()
                            .append('circle')
                            .attr('transform', `translate(${xScale.bandwidth() * 0.5}, ${0})`)      
                            .attr('class', function(d){return `profitMargin profitMarginDots ${d.Month}`})                                 
                            .attr('cy', function(d){return yScaleProfitMargin(d.ProfitMargin)})
                            .attr('cx', function(d){return xScale(d.Month)})
                            .attr('stroke', 'lime')
                            .attr('fill', 'lime');

            profitMarginDots.transition()
                            .duration(100)
                            .delay(function(d, i){return (1000/12)* i + 100})
                            .attr('r', 5);


            // Event on profit margin
            profitMarginDots
            .on('mouseenter', function(event, d){
                    const thisDot = d3.select(this);
                    d3.selectAll('.barChart').style('opacity', 0.3);
                    d3.selectAll('.profitMargin').style('opacity', 0.3);
                    d3.selectAll(`.${d.Month}`).transition().duration(500).style("opacity", 1)
                    thisDot.attr("r", 8)
                    console.log(d)
                    tooltip.transition().duration(300).style("opacity", 0.8); //showing tooltip  
                    tooltip.html(
                                `<span> ${d.Month} ${d.Year} <br></span>
                                <span> Total Sales: ${d3.format("$,")(d.Sales)}<br></span>
                                <span style="color:green;"> Profit Margin: ${d3.format(".0%")(d.Profit/d.Sales)}<br></span>`
                                ) 

                            .style("visibility", "visible") //adding values on tooltip
                            .style("left", event.pageX + "px") //for getting the horizontal or x position of cursor and giving it to tooltip
                            .style("bottom", (window.innerHeight - event.pageY ) + "px"); //for getting y value of cursor and giving it to tooltip

                })
                .on(
                "mouseleave",
                function(event, d) {
                    const thisDot = d3.select(this);
                    d3.selectAll('.barChart').style('opacity', 1);
                    d3.selectAll(`.${d.Month}`).style("opacity", 1)
                    d3.selectAll('.profitMargin').style('opacity', 1);
                    d3.selectAll('.profitMargin').raise()
                    thisDot.transition().duration(500).attr("r", 5)
                    setTimeout(()=>{d3.select(`circle.${d.Month}`).style('opacity', 1);}, 150)
                    tooltip
                            .style("visibility", "none")
                            .transition()
                            .duration(301)
                            .style("opacity", 0);  
                    refLine.raise()
                    thisDot.style('opacity', 1);
                })

            // Reference to 0% line
            const refLine = 
                    graphGroup                                  
                            .append('line')
                            .attr('class', 'profitMarginRefLine')                                 
                            .attr('stroke', function(){
                                if(category == 'Furniture'){
                                    return '#ff5733'
                                }else{
                                    return '#b32d2e'
                                }
                            })
                            .attr('stroke-width', 2)
                            .attr('x1', lmargin + 10)
                            .attr('x2', lmargin + plotWidth)
                            .attr('y1', yScaleProfitMargin(0))
                            .attr('y2', yScaleProfitMargin(0))
                            .attr('stroke-dasharray', 5);

                  
            
                // Animate Profit Margin line
                animateLine(profitMarginLine);

                
                console.log(yScaleProfitMargin.domain());

                if(entry == true){
                // Only when entering from Area Chart

                    // Group for second Axis
                    let secondAxis = yAxisGroup2.append('g')
                                                .call(yAxisProfitMargin)
                                                .attr('class', 'secondYaxis')

                    // Make back button visible
                    d3.select('#BackButton').style('visibility', 'visible')

                    // Animate ref line
                    refLine.attr('x1', lmargin + plotWidth).transition().ease(d3.easeLinear).duration(1000).attr('x1', lmargin + 10)


                    //------------------------------------------
                    //       Legend for Profit Margin Line
                    //------------------------------------------
                    legendGroup.append('line')
                                .attr('class', 'profitmarginlegend')
                                .attr('stroke', 'lime')
                                .attr('x1', -10)
                                .attr('x2', 10)
                                .attr('y1', 76)
                                .attr('y2', 76)
                                .attr('stroke-width', 3);

                    legendGroup.append('circle')
                                .attr('class', 'profitmarginlegend')
                                .attr('fill', 'lime')
                                .attr('transform', 'translate(6, 76)')
                                .attr('r', 5);

                    legendGroup.append('text')
                                .attr('class', 'profitmarginlegend')
                                .attr('fill', 'green')
                                .text('Profit Margin')
                                .attr('transform', 'translate(15, 81)')
                                .style('font-weight', 'bold');


                    // Add a title to the second y-axis
                    secondAxis.append('text')
                    .text('Profit Margin')
                    .attr('y', -25)
                    .attr('x', (tmargin + plotHeight/2))
                    .attr('transform', 'rotate(90)')
                    .style('fill', 'black')
                    .attr('font-size', 14)
                    .attr('text-anchor', 'middle')
                    .attr('class', 'secondYaxis');
                }
                

                //----------------------------------------------------------------
                //                      Editing Information Cards
                //----------------------------------------------------------------

                // Change Total Data Value
                textChange(totalSalesValue,`${d3.format("$,")(categoryTotalSales)}`)
                    
                // Percentage Growth info
                if(year == 2014 && previousTriangleState == false){
                     // rotate triangle and change color
                        animateTriangleACW()
                        previousTriangleState = null;
                    }
                else if(year == 2014 && previousTriangleState != false){
                    percentageGrowthIndicator.transition().duration(1000).style('fill', 'grey')
                    previousTriangleState = null;
                }
                else{
                    if(previousTriangleState == true && categoryPercentageGrowth > 0){
                        percentageGrowthIndicator.transition().duration(1000).style('fill', 'green')
                        previousTriangleState = true;
                    }
                    if(previousTriangleState == false && categoryPercentageGrowth > 0){
                        animateTriangleACW()
                        previousTriangleState = true;
                    }
                    if(previousTriangleState == null && categoryPercentageGrowth > 0){
                        percentageGrowthIndicator.transition().duration(1000).style('fill', 'green')
                        previousTriangleState = true;
                    }
                    if(previousTriangleState != false && categoryPercentageGrowth < 0){
                        // Animate triangle back
                        animateTriangleCW()  
                        previousTriangleState = false ; 
                    }
                }     
            }

        }