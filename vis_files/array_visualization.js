
function array_visualization()
{
	this.index = -1;
	this.enabled = true;
	this.iconsize = 40;
	this.margin = 10;
	this.reset();
}

array_visualization.prototype.setCanvas = function (canvas)
{
    this.outputCanvas = canvas;
    this.outputContext = canvas.getContext('2d');
};

array_visualization.prototype.insert = function (options)
{
	if (this.index == this.array.length - 1)
		this.index++;
	this.array.push(options || {});
	this.array[this.array.length-1].timestamp = Date.now();
};

array_visualization.prototype.removeByIndex = function (index)
{
	this.array.splice(index, 1);
	if (this.index >= this.array.length)
		this.index = this.array.length-1;
};

// callback is a function reference
// callback(element) should return true if this element should be kept
array_visualization.prototype.filter = function (callback)
{
	this.array = this.array.filter(callback);
};

array_visualization.prototype.reset = function ()
{
	this.array = [];
};

array_visualization.prototype.render = function ()
{
	if (!this.enabled)
		return;
		
	var ctx = this.outputContext;
	ctx.font = 'bold 24px monospace';
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	
	var valid_index = Math.max(0, Math.min(this.index, this.array.length - 1));
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