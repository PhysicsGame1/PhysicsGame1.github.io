
function array_visualization()
{
	this.index = 0;
	this.enabled = true;
	this.iconsize = 40;
	this.margin = 10;
	this.count = 0;
}

array_visualization.prototype.setCanvas = function (canvas)
{
    this.outputCanvas = canvas;
    this.outputContext = canvas.getContext('2d');
};

array_visualization.prototype.insert = function (options)
{
	this[this.count] = options;
	this[this.count].timestamp = Date.now();
	this.index = this.count;
	this.count++
};

array_visualization.prototype.reset = function ()
{
	for (var i = 0; i < this.count; i++)
		this[i] = null;
	this.count = 0;
};

array_visualization.prototype.render = function ()
{
	if (!this.enabled)
		return;
		
	var ctx = this.outputContext;
	ctx.font = 'bold 24px monospace';
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	
	var valid_index = Math.max(0, Math.min(this.index, this.count - 1));
	var visibleItems = Math.floor((this.outputCanvas.height - 2 * this.margin) / (this.iconsize + this.margin));
	
	var low = valid_index - Math.floor((visibleItems-1) / 2);
	var high = valid_index + Math.ceil((visibleItems-1) / 2);
	
	var firstIndex, lastIndex;
	if (low < 0)
	{ // Case 1: index is near start
		firstIndex = 0;
		lastIndex = Math.min(this.count, visibleItems) - 1;
	}
	else if (high >= this.count)
	{ // Case 2: index is near end
		firstIndex = Math.max(0, this.count - visibleItems);
		lastIndex = this.count - 1;
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
		ctx.strokeStyle = (time - this[i].timestamp > 5000) ? 'white' : flash;
		ctx.strokeRect(x - 1, y - 1, this.iconsize + 2, this.iconsize + 2);
		
		// Fill the inside with a solid color or call a function to draw
		ctx.fillStyle = this[i].fillStyle || (i == valid_index ? 'blue' : 'yellow');
		
		if (typeof this[i].drawfn == 'function')
			this[i].drawfn(this[i], ctx, x, y, this.iconsize)
		else
			ctx.fillRect(x, y, this.iconsize, this.iconsize);
		
		// Write index number
		ctx.fillStyle = i == valid_index ? 'blue' : 'yellow';
		ctx.fillText(i, x - 35, y + 5);
		
		// Advance to next y coordinate
		y += this.margin + this.iconsize;
	}
};