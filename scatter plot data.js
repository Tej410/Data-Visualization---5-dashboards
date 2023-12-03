
            // Loads the scatter plot data from a JSON file and calls the triangleplot function to plot the data
            d3.json("scatter plot data.json", d3.autoType).then(triangleplot);  

            // Function to plot the data in the triangle plot
            function triangleplot (data) {

                console.log('Data =', data)

                console.log(window.innerWidth)

                // Defines the variables for the x, y, and z dimensions of the plot
                const X = 'Sales'               
                const Y = 'Profit'               
                const Z = 'Quantity'

                // Color Scheme for Categories
                const catColorScheme = d3.scaleOrdinal()
                                .domain(['Furniture', 'Office Supplies', 'Technology'])
                                .range(['brown','orange','dodgerblue'])

                // Global Variables
                let yScale, xScale, plotData, yAxis, yAxisGroup, xAxis, xAxisGroup, maxz, selectedCategory;
                let focusState;

                // Data elements
                let labels, dots, graph;

                // Sets the default level of detail to display the data
                level = 'Category';

                // Extracts the categories and subcategories from the data
                const category = Array.from(new Set(d3.map(data, function(d){return d['Category']})));

                const subcategories = d3.map(data, function(d){return d['Sub-Category']});

                // Data for Sub-Category level
                const subCatData = data;

                /// Creates the data for the category level by summing up the data for each category
                const catData = []
                
                category.forEach(function(d){
                    let obj = {'Category': d, 'Quantity': 0, 'Profit': 0, 'Sales': 0, 'Cost': 0, Discount: []};
                    data.forEach(function(e){
                        if(e.Category == d){
                            obj.Quantity += e.Quantity;
                            obj.Profit += e.Profit;
                            obj.Sales += e.Sales;
                            obj.Cost += e.Cost;
                            obj.Discount.push(e['Discount Rate'])
                        }
                    })
                    obj['Discount Rate'] = d3.mean(obj.Discount)
                    obj['Profitability'] = obj.Profit/obj.Cost
                    catData.push(obj)
                })


                // Dimensions of svg viewport
                const w = 800;
                const h = 500; 
                const lmargin = 50; 
                const rmargin = 130; 
                const tmargin = 30; 
                const bmargin = 50; 
                const plot_width = w - lmargin - rmargin
                const plot_height = h - tmargin - bmargin

                // Making a variable for scale_factor for size of polygon
                const zscale = 0.5;

                // For formating axes vslues to 2 significant figures and short form
                let formatAxis = function(d) {return d == 0? 0: d3.format('$.2s')(d);}
                

                // Creating svg viewport variable                
                const svg = d3.select('#trianglePlot')
                                .append('svg')
                                .attr('width', w)
                                .attr('height', h)
                                .attr('position', 'relative')

                // Group for plotted data
                const plotArea = svg.append('g').attr('id', 'plotArea')


                // Adding tooltip to div
                let tooltip = d3 
                            .select("#trianglePlot")
                            .append("div")
                            .attr("class", "tooltip")
                            .style("opacity", 0);

                // Creating Levels Options Dropdown
                let levelList = ['Category', 'Sub-Category']
                // Create a selection menu
                let levelOptions = document.getElementById("levelOptions");
                for (let i = 0; i < levelList.length; i++) {
                    //creating dynamically options of select menu
                    let option = document.createElement("option");
                    option.value = levelList[i];
                    option.innerHTML = levelList[i];
                    levelOptions.appendChild(option);
                }

                // On change event in Levels Options Dropdown
                d3.select('#levelOptions').on("change", function (d) {
                    // Update level variable
                    level = this.value
                    // Reset category selection to default
                    selectedCategory = null
                    // Interrupt previous transition and awaiting transitions on triangles
                    d3.selectAll('.triangles').interrupt().transition()
                    // Remove elements in plotArea
                    d3.select('#plotArea').html('')
                    // Recalculate scale  
                    calculateScale()
                    // Update and transition Axes
                    updateAxes()
                    // Create data elements again, using level conditions
                    plotpolygon()
                    // refresh legend
                    d3.selectAll('.legend').style('opacity', 1)
                });


                //------------------------------------------------------------
                // Functions for Formulas for Equilateral Triangle dimensions
                //------------------------------------------------------------

                // Function to convert degrees to radians
                function toRadians(degrees) {
                    return degrees * Math.PI/180
                }

                // Function to derive length from the size(area)
                function length(size) {
                    return Math.sqrt((2 * size)/Math.cos(toRadians(30)))
                }

                // Function to derive height from the size
                function height(size) {
                return Math.sqrt(2 * size * Math.cos(toRadians(30)))
                }

                // Function to create triangle path for reuseability
                function makeTrianglePath(x,y,z,zscale,scaleby=1){
                    return `${(xScale(x))}, ${((yScale(y)) - (2 * height(z * zscale * scaleby)/3))} 
                            ${(xScale(x)) - (length(z * zscale * scaleby)/2)}, ${((yScale(y)) - (2 * height(z * zscale * scaleby)/3)) + (height(z * zscale * scaleby))} 
                            ${(xScale(x)) + (length(z * zscale * scaleby)/2)}, ${((yScale(y)) - (2 * height(z * zscale * scaleby)/3)) + (height(z * zscale * scaleby))}`
                }

                //The Animation Function
                function animateTriangle(item){

                    // Create a function for clockwise rotation on center
                    function rotateCW (x, y) {
                        return d3.interpolateString('rotate(0,'+x+','+y+')', 'rotate(360,'+x+','+y+')')
                    }

                    plotArea
                        .selectAll(item)
                        .transition()
                        .duration(2000)
                        .attrTween('transform' , function(d,i,a){ return rotateCW(xScale(d[X]), yScale(d[Y]))} )

                }

                //The Animation  Stop Function
                function stopAnimation(item){

                    plotArea
                        .selectAll(item)
                        .transition()
                        .attrTween('transform' , function(d,i,a){ return d3.interpolateString( "rotate(0)", "rotate(0)")} )
                        
                }


                function calculateScale(create = false) {
                    // When create = true , function calls the yAxis and xAxis and their titles

                    if(level == 'Category'){
                        plotData = catData;
    
                    }else {
                        plotData = subCatData;
                    }
                    
                    //Find the max value in X
                    const maxx = d3.max(plotData.map(function(d){return (d[X]);}))

                    // Find the max value in Y
                    const maxy = d3.max(plotData.map(function(d){return (d[Y]);}))

                    // Find the max value in Z
                    maxz = d3.max(plotData.map(function(d){return (d[Z]);}))

                    // Find the min value in X
                    const minx = d3.min(plotData.map(function(d){return (d[X]);}))

                    // Find the min value in Y
                    const miny = d3.min(plotData.map(function(d){return (d[Y]);}))                

                    // Find true scales of Y and Z to calculate allowance for triangles
                    const ytrueScale = (plot_height - height(maxz * zscale))/(maxy - miny)

                    const xtrueScale = (plot_width - length(maxz * zscale))/(maxx - minx)

                    // using largest z to calculate allowance for Y and Z scales
                    const allowanceY = (height(maxz * zscale)) / ytrueScale

                    const allowanceX = (length(maxz * zscale)) / xtrueScale

                    // New maxX maxY minX and MinY with calculated allowance

                    const maxx2 = allowanceX/2 + maxx 

                    const minx2 = minx - allowanceX/2

                    const maxy2 = (2*allowanceY)/3 + maxy

                    const miny2 = miny - allowanceY/3


                    // Scales 
                    yScale = d3.scaleLinear()
                                        .domain([miny2, maxy2])
                                        .range([h - bmargin, tmargin]);

                    xScale = d3.scaleLinear()
                                        .domain([0, maxx2])
                                        .range([lmargin, w - rmargin]);

                    if(level == 'Category') {
                        xScale.domain([minx2, maxx2])
                        yScale.domain([0, maxy2])
                    }

                    //THE AXES

                    // Choose a left axis type for our y-axis, because it will be on the left
                    yAxis = d3.axisLeft(yScale).tickFormat(formatAxis)

                    // Choose a bottom axis type for our x-axis, cause the x-axis is needed on the bottom
                    xAxis = d3.axisBottom(xScale).tickFormat(formatAxis).tickSizeOuter([0])
                                        

                    if(create == true) {
                    // Call the axes

                        // Create a group for our y-axis
                        yAxisGroup = svg.append('g')
                                                .attr('class', 'yaxis')
                                                .attr('transform', `translate(${lmargin}, ${0})`)
                                                .call(yAxis);  //call the y-axis type with the yscale created

                        // Add a title to the y-axis
                        yAxisGroup.append('text')
                                    .text(Y)
                                    .attr('y', tmargin - 3)
                                    .style('fill', 'black')
                                    .attr('font-size', 14)
                                    .attr('text-anchor', 'middle');

                        // Create a group for our x-axis
                        xAxisGroup = svg.append('g')
                                                .attr('class', 'xaxis')
                                                .attr('id', 'xaxis')
                                                .attr('transform', `translate(${0}, ${yScale(0)})`)
                                                .call(xAxis); //call the x-axis created with xScale

                        // Add a title to the x-axis
                        xAxisGroup.append('text')
                                    .text(X)
                                    .attr('x', lmargin + plot_width)
                                    .attr('transform', 'translate (0, -3)')
                                    .style('fill', 'black')
                                    .attr('font-size', 14)
                                    .attr('text-anchor', 'end')
                    }

                    // for indication that axis does not start at 0
                    function lineBreak(){
                        if(level == 'Category'){

                                 breakGroup = xAxisGroup.append('g').attr('class', 'lineBreak')
                                
                                 breakGroup.append('path').attr('stroke', 'white').attr('stroke-width', '10px').attr('d', `M ${lmargin + 10} 0.5  h 16`) 

                                 breakGroup.append('path').attr('stroke', 'currentColor').attr('transform', 'skewX(270)').attr('d', `M ${lmargin + 10} 0.5  l 2 -7 l 4 14 l 4 -14 l 4 14 l 2 -7`) 
                                            .transition().ease(d3.easeLinear).duration(1000).attr('transform', 'skewX(0)')
                             
                         }else{
                             d3.selectAll('.lineBreak').transition().ease(d3.easeLinear).duration(1000).attr('transform', 'skewX(-90)').remove()
                         }
     
                    }

                    // apply line break to xAxis
                    lineBreak()
                                        
                }

                function updateAxes(){
                // Update axis transition function

                    yAxisGroup.transition().duration(1500).call(yAxis)

                    xAxisGroup.transition().duration(1500)
                              .attr('transform', `translate(${0}, ${yScale(0)})`)
                              .call(xAxis) //call the x-axis created with xScale
                              .on('end', function(d){
                                // If on Sub-Category level...
                                if(level == 'Sub-Category'){
                                    // ...delay removal of first node in xaxis for neater appearance
                                    setTimeout(()=> {d3.select('.xaxis .tick').node().innerHTML = '';}, 15) 
                                }
                              })   
                    
                }

                function plotpolygon(create = false, duration = 1000) {
                // When create = true, function creates elements with first instance animation
                // Duration is the duration of first instance animation

                // Labels for sub-category
                labels = plotArea.selectAll('text')
                                        .data(plotData)
                                        .enter()
                                        .append('text')
                                            .attr('class', function(d) {return `datalabels data ${d[level].replace(/ /g, '_')}`}) //
                                            .text(function(d){return d[level]})//
                                            .style('fill', 'black') //
                                            .attr('font-size', 14) //
                                            .attr('text-anchor', 'middle')

                // Plot the scatter plot using triangles in the plotarea group
                graph =
                    plotArea.selectAll('polygon.triangles') 
                    .data(plotData, d => d['Category'])
                    .enter()
                    .append('polygon')
                        .attr('class', function(d) { return `triangles data ${d.Category == "Office Supplies"? "Office_Supplies" : d.Category} ${d['Sub-Category'] == "Office Supplies"? "Office_Supplies" : d['Sub-Category']}`})                   
                        .attr('fill', function(d, i) {return catColorScheme(d.Category) })
                        .attr('opacity', 0.5)
                        .attr('stroke', 'black')
                        .attr('stroke-width', 2)
                        
                        
                // Signify the center with circles
                dots = plotArea.selectAll('circle')
                                        .data(plotData)
                                        .enter()
                                        .append('circle')
                                            .attr('class', function(d) {return `dots data ${d[level].replace(/ /g, '_')}`})
                                            .attr('r', 3) // choose a minimal values for radius of circles
                                            .attr('fill', 'black') //can choose color of choice


                if(create == true) {
                // Animation for first entrance
                                                       
                labels                                       
                    // Appear in the center of plot area
                    .attr('x', function(d){return (plot_width/2 + lmargin);})
                    .attr('y', function(d){return plot_height/2 + tmargin + height(d[Z] * zscale)/3 + 12;})
                    // Transition to position    
                    .transition().duration(duration)//(1000)
                    .attr('x', function(d){return (xScale(d[X]));})
                    .attr('y', function(d){return yScale(d[Y]) + height(d[Z] * zscale)/3 + 12;})

                graph
                    // Appear in middle of plot area
                    .attr('points', function(d) {return makeTrianglePath(xScale.invert(plot_width/2 + lmargin),yScale.invert(plot_height/2 + tmargin),d[Z], zscale)})
                    // Transition to position 
                    .transition().duration(duration)
                    .attr('points', function(d) {return makeTrianglePath(d[X],d[Y],d[Z], zscale)})
                    .on('end', function(event){
                        d3.selectAll('.triangles').classed('active', true)
                        animateTriangle('.active');
                    })

                dots// appear in middle of plot area
                    .attr('cx', function(d){return (plot_width/2 + lmargin);})
                    .attr('cy', function(d){return (plot_height/2 + tmargin);})
                    // transition to position 
                    .transition().duration(duration)//(1000)
                    .attr('cx', function(d){return (xScale(d[X]));})
                    .attr('cy', function(d){return (yScale(d[Y]));})

                }
                                           
                else if(level == 'Category') {
                // Animation for change from Sub-Category to Category

                labels
                    // start from right
                    .attr('x', function(d){return w + (length(maxz * zscale));})
                    .attr('y', function(d){return yScale(d[Y]) + height(d[Z] * zscale)/3 + 12;})
                    // transition to position 
                    .transition().duration(1500)
                    .attr('x', function(d){return (xScale(d[X]));})
                    //.attr('y', function(d){return yScale(d[Y]) + height(d[Z] * zscale)/3 + 12;})

                graph
                    // start from right
                    .attr('points', function(d) {return makeTrianglePath(xScale.invert(w + (length(maxz * zscale))),d[Y],d[Z], zscale)})
                    // transition to position 
                    .transition().duration(1500)
                    .attr('points', function(d) {return makeTrianglePath(d[X],d[Y],d[Z], zscale)})
                    .on('end', function(event){
                        d3.selectAll('.triangles').classed('active', true)
                        animateTriangle('.active');
                    })
                
                dots
                    // start from right
                    .attr('cx', function(d){return w + (length(maxz * zscale));})
                    .attr('cy', function(d){return (yScale(d[Y]));})
                    // transition to position 
                    .transition().duration(1500)
                    .attr('cx', function(d){return (xScale(d[X]));})
                                     
                } 
                else if(level == 'Sub-Category') {
                // Animation for change from Category to Sub-Category

                labels
                    // Appear after transition
                    .style('opacity', 0)
                    .attr('x', function(d){return (xScale(d[X]));})
                    .attr('y', function(d){return yScale(d[Y]) + height(d[Z] * zscale)/3 + 12;})
                    .transition()
                    .duration(500)//(textduration)
                    .style('opacity', 1)
                    // delay by animation in duration 
                    .delay(2500)  
                    
                graph

                    .transition().duration(0)//1500)
                    .attr('points', function(d) {return makeTrianglePath(0,0,d[Z], zscale)})
                    .transition().duration(1500)//(1000)
                    .attr('points', function(d) {return makeTrianglePath(d[X],0,d[Z], zscale)})
                    .transition().duration(1000)
                    .attr('points', function(d) {return makeTrianglePath(d[X],d[Y],d[Z], zscale)})
                    .on('end', function(event){
                        d3.selectAll('.triangles').classed('active', true)
                        animateTriangle('.active');
                    })

                dots
                    .style('opacity', 0)
                    .attr('cx', function(d){return xScale(d[X]);})
                    .attr('cy', function(d){return yScale(d[Y]);})
                    .transition()
                    .duration(500)//(textduration)
                    .style('opacity', 1)
                    // delay by animation in duration 
                    .delay(2500)     
                }                       

                // Attach Events on the Polygons
                const scale_by = 1.5  // increase by 20%
                let hoverState;

                //graph
                d3.selectAll('.triangles')
                .on(
                    'mouseenter',
                    function(event, d) {
                        const thisPath = d3.select(this);
                        if(thisPath.classed('active')== true){
                        
                            thisPath.classed('hoverState', true)
                            console.log(thisPath.datum()[level])
                            let dataclass = thisPath.datum()[level].replace(/ /g, '_')
                            d3.selectAll(`polygon.${dataclass}`)
                            thisPath.style("opacity", 1);                    
                            thisPath.attr('points', function(d) {return makeTrianglePath(d[X],d[Y],d[Z], zscale, scale_by)})
                            thisPath.raise();
                            d3.select(`circle.${dataclass}`).raise()
                            d3.select(`text.${dataclass}`).style('opacity', 0)
                            thisPath.classed('rotate', true)

                            animateTriangle('.rotate')
                            // show the tooltip
                            tooltip.transition().duration(300).style("opacity", 0.8); //showing tooltip
                            // determine whether the data value at the Y-axis is a profit or loss
                            let profit, label, textcolor;
                            if (d[Y]>0){
                                profit = 'Profit'
                                textcolor = 'green'
                            }else{
                                profit = 'Loss'
                                textcolor = 'red'
                            }
                            tooltip //adding data in tooltip
                            .html(
                                `<img class = "tooltipimg" src = "img/${d[level]}.jfif" alt = "" align = "left">
                                <span class = "tooltiptext">
                                <span style="font-size:14px;font-weight:bold">${level}: ${d[level]}<br></span>
                                <span style="font-size:14px;font-weight:bold;color:${textcolor}">${profit}: ${d3.format("$,")(Math.abs(d[Y]))} <br></span>` +
                                `<span style="font-size:14px;font-weight:bold">Sales: ${d3.format("$,")(d[X])}<br></span>
                                <span style="font-size:14px;font-weight:bold">Quantity: ${d3.format(",")(d[Z])}<br>
                                Avg Discnt: ${d3.format(".0%")(d['Discount Rate'])}<br>
                                Profitability: ${d3.format(".0%")(d['Profitability'])}<br>
                                </span></span>`) 
                    
                                // instaed of enclosing text in span use div
                                // set tooltip style and position
                            .style("visibility", "visible") //adding values on tooltip
                            .style("left", event.pageX + "px") //for getting the horizontal or x position of cursor and giving it to tooltip
                            .style("top", event.pageY + "px"); //for getting y value of cursor and giving it to tooltip
                            
                            // create a function to repeatedly rotate the path if it is still in hover state
                            function repeatRotate(){
                                setTimeout(()=> {
                                    animateTriangle('.rotate');
                                    if(thisPath.classed('hoverState') == true){
                                        repeatRotate()
                                    }
                                }, 2000)
                            }
                            repeatRotate()
                            
                        }
                })
                .on(
                    "mouseleave",
                    function(event) {
                        const thisPath = d3.select(this);
                        if(thisPath.classed('active')== true){
                            thisPath.classed('hoverState', false)
                            thisPath.interrupt().transition()
                            let dataclass = thisPath.datum()[level].replace(/ /g, '_')
                            d3.select(`text.${dataclass}`).style('opacity', 1)
                            thisPath.classed('rotate', false)
                            thisPath.attr('points', function(d) {return makeTrianglePath(d[X],d[Y],d[Z], zscale)})
                            thisPath.style("opacity", 0.5)
                            thisPath.attr('id', 'stoprotate')
                            stopAnimation('#stoprotate');
                            tooltip
                                .style("visibility", "none")
                                .transition()
                                .duration(301)
                                .style("opacity", 0);
                        }
                    }) 
                }
                   
                calculateScale(create = true)
                plotpolygon(create = true)
                // Animate triangles is ingrained in plotpolygon function


            //-------------------------------
            //             LEGEND
            //-------------------------------
            // Create a group element for the legend and move it to the top right of the chart area
            const legendGroup = svg
                                .append('g')
                                    .attr('id', 'legend-group')
                                    .attr("transform", `translate(${w - rmargin},${tmargin + 20})`);
            
            // Define a triangle symbol using d3.symbol()
            const triangle = d3.symbol().type(d3.symbolTriangle)
            
            // Create a path element for each category in the data array
            // The path is a triangle symbol filled with the color associated with the category
            // The path element is given a class name 'legend' and a second class name that replaces spaces in the category name with underscores
            const legend  = legendGroup
                                .selectAll('path')
                                .data(category)
                                .enter()
                                .append('path')
                                    .attr('d', triangle.size(120))
                                    .attr('transform', (d,i) => `translate(0,${i * 35 - 25})`)
                                    .style("fill", function(d){return catColorScheme(d)})
                                    .attr('class', function(d){ return `legend ${d.replace(' ', '_')}` });

            // Create a text element for each category in the data array
            // The text is the name of the category and is positioned to the right of the corresponding triangle symbol
            // The text element is given a class name 'legend' and a second class name that replaces spaces in the category name with underscores
            // The text element is also given the class name 'button'
            const legendText  = legendGroup
                                .selectAll('text')
                                .data(category)
                                .enter()
                                .append("text")  
                                    .attr("x", 12) 
                                    .attr("y", function(d, i) {return i*35 - 25})               
                                    .attr("dy", ".25em") // 1em is the font size so 0.35em is 35% of the font size. This attribute offsets the y position by this amount.
                                    .attr("text-anchor", "start")
                                    .style("fill", function(d){return catColorScheme(d)})
                                    .text(function(d){return d})
                                    .attr('class', function(d){ return `legend ${d.replace(' ', '_')}` })
                                    .classed('button', true)

           

            // Adding Event to legend
            legendText
            .on(
                'click',
                function(event) {
                    const thisPath = d3.select(this);
                    if (selectedCategory == thisPath.data()[0]){
                    // If category selection is the same, return all data elements
                        allCategory()
                        d3.selectAll('.legend').style('opacity', 1)
                        // Reset category selection
                        selectedCategory = null;
                        focusState = false;
                    }
                    else{
                        // Update selected category with clicked
                        selectedCategory = thisPath.data()[0]
                        // Filter by category selection with selectCategory fxn 
                        selectCategory(selectedCategory)
                        d3.selectAll('.legend').style('opacity', 0.3)
                        d3.selectAll(`.legend.${selectedCategory.replace(' ', '_')}`).style('opacity', 1)
                        focusState = true;
                    }
                }
            )

            function selectCategory(category) {
            // Function for filtering the data by category

                d3.selectAll('.catselected')
                .classed('catselected', false)

                legendText
                    .filter(function(d) { return d[0]  ==  category;})
                    .classed('catselected', true)


                setTimeout(()=> {d3.selectAll(`polygon:is(.${(category).replace(' ', '_')})`).classed('active', true);}, 1500);

                d3.selectAll(`polygon:not(.${(category).replace(' ', '_')})`).classed('active', false) 

                graph.transition().duration(1500)
                        // manually stop animation and set polygons upright
                        .attrTween('transform' , function(d,i,a){ return d3.interpolateString('rotate(0,'+xScale(d[X])+','+yScale(d[Y])+')', 'rotate(0,'+xScale(d[X])+','+yScale(d[Y])+')')})
                        .attr('points', function(d) { return  d.Category != category? makeTrianglePath(d[X],d[Y],0, zscale) : makeTrianglePath(d[X],d[Y],d[Z], zscale)})
                
                dots.transition().duration(1500)
                    //  When dots are not related to selected category reduce radius to 0px...
                    // ... else keep at or increase radius to 3px
                    .attr('r', function(d) { return  d.Category != category? 0 : 3})
                                          
                labels.transition().duration(1500)
                        // When labels are not related to selected category reduce font size to 0px...
                        // ... else keep at or increase font size to 14px 
                        .attr('font-size', function(d){return  d.Category != category? 0 : 14})
                      
            };
            
            function allCategory() {
                // Empty all elements in plotarea
                d3.select('#plotArea').html('') 
                // create new instance of triangles
                plotpolygon(true, 0) 
            };   
            
            svg.on('dblclick', function(event){
                if(focusState == true){
                    // Bring back all polygons
                    allCategory()
                    // Remove transparency from legend
                    d3.selectAll('.legend').style('opacity', 1)
                }
            })

        }
