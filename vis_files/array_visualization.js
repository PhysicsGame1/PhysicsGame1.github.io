/**********************************************************************************************************************
	Data Structure of array_visualization
 **********************************************************************************************************************
	Key                           Type          Meaning
		.iconsize                   Integer       The output width/height of each element
		.index                      Integer       The current index, render() strives to keep this visible on the canvas
		.margin                     Integer       The amount of space between consecutive elements in the output

		.outputCanvas               HTMLElement   The canvas to render on          
		.outputContext              --            2d canvas context
		
		.array[n]
			.timestamp                Integer       Time when this element was inserted
			.drawfn                   function      User supplied custom rendering function for this element
 **********************************************************************************************************************
	Notes:
	Functions beginning with _ underscore are for internal use.
	
	The drawfn function can be used to perform custom rendering of each element. If a custom drawfn is not supplied, each
	element will be drawn as a solid color square. drawfn is called once for each element to be rendered as follows:
	
	drawfn(element, context, x, y, size)
		element - This is the object passed to an earlier call to insert()
		context - Canvas rendering context
		x - The x coordinate of the left side of the area reserved for drawing element
		y - The y coordinate of the upper side of the area reserved for drawing element
		size - The width/height of the area reserved for drawing element
		
	Note your drawing should be a square, so size == width == height. Example usage:
	
	var avis = new array_visualization()
	avis.setCanvas(canvas_element);
	avis.insert( { color:'red', drawfn: my_draw } );
	avis.insert( { color:'green', drawfn: my_draw } );
	avis.render();
	
	// Draw a circle
	my_draw(element, context, x, y, size)
	{
		var radius = size / 2;
		context.strokeStyle = element.color;
		context.beginPath();
		context.arc(x + radius, y + radius, radius, 0, 2 * Math.PI);
		context.stroke();
	}
	
 ***********************************************************************************************************************/
function array_visualization()
{
	this.index = -1;
	this.iconsize = 40;
	this.margin = 10;
	this.reset();
}

/************************************************************
 * Function: setCanvas
 * Parameters: 
 *    canvas - HTMLElement
 * What it does: 
 *    Sets the canvas the visualization renders to.
 * Return value: None
 ************************************************************/
array_visualization.prototype.setCanvas = function (canvas)
{
		this.outputCanvas = canvas;
		this.outputContext = canvas.getContext('2d');
};

/************************************************************
 * Function: reset
 * What it does: 
 *    Resets the internal state of the visualization.
 *    Does not affect anything related to rendering.
 * Return value: None
 ************************************************************/
array_visualization.prototype.reset = function ()
{
	this.array = [];
};

/************************************************************
 * Function: insert
 * Parameters: 
 *    options - A JavaScript object containing
 * What it does: 
 *    Inserts a new element into the visualization.
 * Return value: None
 ************************************************************/
array_visualization.prototype.insert = function (options)
{
	if (this.index == this.array.length - 1)
		this.index++;
	this.array.push(options || {});
	this.array[this.array.length-1].timestamp = Date.now();
};

/************************************************************
 * Function: removeByIndex
 * Parameters: 
 *    index - Index of the element to be deleted
 * What it does: 
 *    Removes the element at index from the visualization.
 * Return value: None
 ************************************************************/
array_visualization.prototype.removeByIndex = function (index)
{
	this.array.splice(index, 1);
};

/************************************************************
 * Function: filter
 * Parameters: 
 *    callback - function that determines which elements are to be removed
 * What it does: 
 *    Steps through each element of the array passing it to the
 *    supplied function. If callback returns false, the element
 *    is removed from the visualization.
 *    See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
 * Return value: None
 ************************************************************/
array_visualization.prototype.filter = function (callback)
{
	this.array = this.array.filter(callback);
};

/************************************************************
 * Function: render
 * What it does: 
 *    Renders the visualization on the selected canvas.
 * Return value: None
 ************************************************************/
array_visualization.prototype.render = function ()
{
	var ctx = this.outputContext;
	ctx.font = 'bold 24px monospace';
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	
	var valid_index = this._validate_index();
	var visibleItems = Math.floor((this.outputCanvas.height - 2 * this.margin) / (this.iconsize + this.margin));
	
	var low = valid_index - Math.floor((visibleItems-1) / 2);
	var high = valid_index + Math.ceil((visibleItems-1) / 2);
	
	var firstIndex, lastIndex;
	if (low < 0)
	{ // Case 1: index is near start
		firstIndex = 0;
		lastIndex = Math.min(this.array.length, visibleItems) - 1;
	}
	else if (high >= this.array.length)
	{ // Case 2: index is near end
		firstIndex = Math.max(0, this.array.length - visibleItems);
		lastIndex = this.array.length - 1;
	}
	else
	{ // Case 3: index is in middle
		firstIndex = low;
		lastIndex = high;
	}
	
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
	
	var y = this.margin;
	var x = this.outputCanvas.width - this.margin - this.iconsize;
	var time = Date.now();
	var flash = 'rgb(255,255,' + Math.floor(126*(1 + Math.sin(time / 250 * Math.PI))) + ')';
	//console.log("rendering " + firstIndex + "->" + lastIndex);
	for (var i = firstIndex; i <= lastIndex; i++)
	{
		// Draw border
		ctx.strokeStyle = (time - this.array[i].timestamp > 5000) ? 'white' : flash;
		ctx.strokeRect(x - 1, y - 1, this.iconsize + 2, this.iconsize + 2);
		
		// Fill the inside with a solid color or call a function to draw
		ctx.fillStyle = this.array[i].fillStyle || (i == valid_index ? 'blue' : 'yellow');
		
		if (typeof this.array[i].drawfn == 'function')
			this.array[i].drawfn(this.array[i], ctx, x, y, this.iconsize);
		else
			ctx.fillRect(x, y, this.iconsize, this.iconsize);
		
		// Write index number
		ctx.fillStyle = i == valid_index ? 'white' : 'dimgrey';
		ctx.fillText(i, x - 35, y + 5);
		
		// Advance to next y coordinate
		y += this.margin + this.iconsize;
	}
};

/************************************************************
 *            Internal Functions
 ************************************************************/
 array_visualization.prototype._validate_index = function()
{
	return this.index = Math.max(0, Math.min(this.index, this.array.length - 1));
};