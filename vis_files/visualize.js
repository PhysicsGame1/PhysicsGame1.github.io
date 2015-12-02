/*
    visualization
        .font                   Font family name eg: 'Arial'
        .fontHeightCache[font]  Cache for font heights that have already been calculated
        .fontSize               Font size in pixels
        .fontSizeMin            Smallest font size the visualization will use
        .fontSizeMax            Largest font size the visualization will use
        .insideMargins          Pixels size of margins inside of variable box
        .needPositionUpdate     should positions of all variables be recalculated? (implies redraw all)
        .outputCanvas           canvas to render on          
        .outputContext          2d canvas context
        .outsideMargins         Pixels size of margins outside of variable box
        .prevRenderPos
            .w                  Previous render width
            .h                  Previous render height
            .x                  Previous render x coordinate
            .y                  Previous render y coordinate
        .root                   Contains the tree used to calculate variable render positions
		.roundingRule			Contains a value used to round output numbers
        .variables[key]
            .value              value of this key
            .highlight          should this be highlighted?
            .redraw             should this be redrawn next render?
            .renderPos
                .w                  Previous render width
                .h                  Previous render height
                .x                  Previous render x coordinate
                .y                  Previous render y coordinate

*/

function visualization()
{
    this.variables = {};
    this.fontHeightCache = {};

    this.insideMargins = 5;
    this.outsideMargins = 15;
    this.font = 'Times New Roman';
    this.fontSizeMin = 8; 
    this.fontSizeMax = 30;
    this.prevRenderPos = { w:-1, h:-1, x:-1, y:-1 };
    this.fontSize = this.fontSizeMax;
    this.needPositionUpdate = true;
    this.warn = false;
	this.roundingRule = 10000;
	this.renderStyle = 2;
}

// vis.setCanvas( document.getElementById('visualizeCanvas') );
visualization.prototype.setCanvas = function (canvas)
{
    this.outputCanvas = canvas;
    this.outputContext = canvas.getContext('2d');
    this.needPositionUpdate = true;
};

visualization.prototype.setVariable = function (key, value)
{
    if (key in this.variables)
    {
        var v = this.variables[key];
        
        var oldsz = v.renderPos;
        var newsz = this._calcVarRenderSize(key);
        newsz.w += this.outsideMargins; newsz.h += this.outsideMargins;
        if (newsz.w > oldsz.w || newsz.h > oldsz.h)
            this.needPositionUpdate = true;

        //if (value.toString().length > v.value.toString().length)
        //    console.log("Update?");

		if (v.useDelta)
		{
			if (value > v.value)
				v.delta = "▲";
			if (value < v.value)
				v.delta = "▼";
			//if (value == v.value)
			//	v.delta = "";
		}
		
        v.redraw = true;
		v.value = value;
			
    }
    else
    {   // Variable has not been set yet, set to defaults
        this.variables[key] = { value: value, highlight: false, redraw: true, renderPos: { w: -1, h: -1 }, roundingRule:100000, useDelta:false, delta:"" };
        this.needPositionUpdate = true;
        //console.log("add " + name + " = " + value);
    }
};

visualization.prototype.highlightVariable = function (key)
{
    if (key in this.variables)
    {
        this.variables[key].highlight = true;
        this.variables[key].redraw = true;
    }
};

visualization.prototype.unhighlightVariable = function (key)
{
    if (key in this.variables)
    {
        this.variables[key].highlight = false;
        this.variables[key].redraw = true;
    }
};

visualization.prototype.unhighlightAll = function ()
{
    for (key in this.variables)
    {
        this.variables[key].highlight = false;
        this.variables[key].redraw = true;
    }
};

visualization.prototype.setRoundingRule = function(key, decimals)
{
	this.variables[key].roundingRule = Math.pow(10, decimals);
}

visualization.prototype.showDelta = function(key, useDelta)
{
	this.variables[key].useDelta = useDelta;
	if (useDelta == false)
		this.variables[key].delta = "";
}

visualization.prototype._calcVarRenderSize = function (key)
{
    var ctx = this.outputContext;
    ctx.font = this.fontSize + "px " + this.font;
    var v = this.variables[key].value;
	
    var marginWidth = 2 * this.insideMargins;
    var fontHeight = this._determineFontHeight(this.fontSize + "px " + this.font);
	//console.log(fontHeight);
	var sectionHeight = fontHeight + marginWidth;
	
	if (typeof v == 'object' && v != null)
	{ // Object or array
	    /*
	    var maxWidth = ctx.measureText(key).width;
		var count = 1;
		for (i in v)
		{
			var w = ctx.measureText(w).width;
			if (w > maxWidth)
				maxWidth = w;
			count++;
		}
		return { h: sectionHeight * count, w: maxWidth + marginWidth };
		*/
		return { h:0, w:0};
	}
	else 
	{ // This is a simple type
	    var maxWidth = ctx.measureText(key).width;
		var valueWidth = ctx.measureText(this._formatValue(key)).width;
		var maxWidth = maxWidth > valueWidth ? maxWidth : valueWidth;
		return { h: sectionHeight * 2, w: maxWidth + marginWidth };
	}
};

visualization.prototype._2DbinPack = function (w, h)
{
    var warn = true;
	for(this.fontSize = this.fontSizeMax; this.fontSize > this.fontSizeMin && warn; this.fontSize -= 2)
	{
	    warn = false;
		var root = new visualization_node(0, 0, w, h);
		var sizes = [];

		for (key in this.variables)
		{
		    var sz = this._calcVarRenderSize(key);
			sizes.push({ varObj:this.variables[key], w: sz.w, h: sz.h });
		}

		// sort on width greatest to least
		sizes.sort(function (a, b) { return b.w - a.w; });
		for (i in sizes)
		{
		    sizes[i].varObj.renderPos = null;
		    var res = root.insert(sizes[i].varObj, sizes[i].w + this.outsideMargins, sizes[i].h + this.outsideMargins);
			if (res == false)
				warn = true;
		}
	}
	this.fontSize += 2;  // Seems this.fontSize -= 2 runs even if the condition is false
    return warn;
};

visualization.prototype.render2 = function(x, y, w, h)
{
	var fontHeight = this._determineFontHeight(this.fontSize + "px " + this.font);
	var ctx = this.outputContext;
	
	ctx.font = this.fontSize + "px " + this.font;
	
	var oldtextAlign = ctx.textAlign;
	var oldtextBaseline = ctx.textBaseline;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
	
	ctx.fillStyle = 'black';
    ctx.fillRect(x, y, w, h);
	
	for (key in this.variables)
	{
		var v = this.variables[key];
		if (v.highlight)
			ctx.fillStyle = 'yellow';
		else
			ctx.fillStyle = 'white';
		
		if (typeof v.value == 'object' && v.value != null)
		{ // Object or array
			ctx.fillText(key + ".", x + 10, y);
			y = this._printObj(v.value, x + 10, y + fontHeight, ' ');
		}
		else
		{
			ctx.fillText(key + " = " + v.delta + this._formatValue(key), x + 10, y);
			y += fontHeight;
		}	
	}
	
	ctx.oldtextAlign = ctx.textAlign;
	ctx.textBaseline = oldtextBaseline;
}

visualization.prototype._printObj = function(obj, x, y, prevBoxchar)
{
	var fontHeight = this._determineFontHeight(this.fontSize + "px " + this.font);
	var ctx = this.outputContext;
	var yStart = y;
	var last;
	for (var key in obj)
		last = key;
	for (var key in obj)
	{
		var boxchar = prevBoxchar + '├';
		if (key == last)
			boxchar = prevBoxchar + '└';
		if (typeof obj[key] == 'object' && obj[key] != null)
		{
			ctx.fillText(boxchar + ' ' + key + ".", x, y);
			y = this._printObj(obj[key], x, y + fontHeight, prevBoxchar + '│');
		}
		else
		{
			ctx.fillText(boxchar + ' ' + key + " = " + obj[key], x, y);
			y += fontHeight;
		}
	}
	
	//ctx.stroke();
	return y;
}


// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
visualization.prototype.render = function (x, y, w, h)
{
	if (this.renderStyle == 2)
	{
		this.render2(x, y, w, h);
		return;
	}
	
	// Old rendering code...
	
    var ctx = this.outputContext;
    var redrawAll = false;
    // If flag set or dimensions of render area changed, we need to recalculate variable positions
    if (this.needPositionUpdate || this.prevRenderPos.w != w || this.prevRenderPos.h != h)
    {
		this.warn = this._2DbinPack(w - this.outsideMargins, h - this.outsideMargins);
		this.needPositionUpdate = false;
		redrawAll = true;
	}
	
    // If rendering to a different coordinate, always redraw
    if (this.prevRenderPos.x != x || this.prevRenderPos.y != y)
        redrawAll = true;

    ctx.font = this.fontSize + "px " + this.font;
	var oldtextAlign = ctx.textAlign;
	var oldtextBaseline = ctx.textBaseline;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (redrawAll)
    {
        // Clear background
        ctx.fillStyle = 'black';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        console.log("Variable visualization: Full redraw");
    }

    for (key in this.variables)
    {
        if (redrawAll || this.variables[key].redraw)
         this.drawVariable(key, x, y);
    }
    
	if (this.warn == true)
	{		
		ctx.font = "20px Times New Roman";
		ctx.fillStyle = 'black';
		ctx.fillText("Warning: Not all variables fit in the canvas!", x + 1, y + 1);
		ctx.fillStyle = 'red';
		ctx.fillText("Warning: Not all variables fit in the canvas!", x, y);
	}
	ctx.oldtextAlign = ctx.textAlign;
	ctx.textBaseline = oldtextBaseline;
	this.prevRenderPos = { x: x, y: y, w: w, h: h };
};

visualization.prototype.drawVariable = function (key, xOffset, yOffset)
{
    //console.log("redraw " + key + this.fontSize);
    var v = this.variables[key];
    if (v.renderPos == null)
        return; // No space on canvas
    var x = v.renderPos.x + this.outsideMargins + xOffset;
    var y = v.renderPos.y + this.outsideMargins + yOffset;
    var w = v.renderPos.w - this.outsideMargins;
    var h = v.renderPos.h - this.outsideMargins;

    //console.log(key + " drawn at (" + x + ", " + y + ")");
    var ctx = this.outputContext;

    ctx.fillStyle = 'white';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

    var marginWidth = 2 * this.insideMargins;
    var fontHeight = this._determineFontHeight(this.fontSize + "px " + this.font);
    var sectionHeight = fontHeight + marginWidth;

    if (typeof v.value == 'object' && v.value != null)
    { // Object or array
        console.log("Warning: try to render object");
    }
    else
    { // This is a simple type
        ctx.fillStyle = 'silver';
        ctx.fillRect(x, y, w, sectionHeight);

        // Draw bottom half of box (variable value)
        if (v.highlight)
        {
            ctx.fillStyle = 'gold';
            ctx.fillRect(x, y + sectionHeight, w, sectionHeight)
        }

        // Draw border
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(x, y + sectionHeight);
        ctx.lineTo(x + w, y + sectionHeight);
        ctx.rect(x, y, w, sectionHeight * 2);
        ctx.stroke();

        // Write text
        ctx.fillStyle = 'black';
        var xText = x + this.insideMargins;
        var yText = y + this.insideMargins;
        ctx.fillText(key, xText, yText, w - marginWidth);
		ctx.fillText(this._formatValue(key), xText, yText + sectionHeight, w - marginWidth);

    }

    v.redraw = false;
}

visualization.prototype._formatValue = function(key)
{
	var v = this.variables[key].value
	if (v == Number(v) && v % 1 != 0) // v is float
		return Math.round(v * this.variables[key].roundingRule) / this.variables[key].roundingRule;
	else
		return v;
}

function visualization_node(x, y, w, h)
{
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.inUse = false;
}

visualization_node.prototype.isLeaf = function()
{
    return (this.left == null && this.right == null);
}

visualization_node.prototype.insert = function(varObj, w, h)
{
    if (this.isLeaf())
    { // this node is a leaf
        if (this.inUse)
            return false; // Already in use
        if (this.w < w || this.h < h)
            return false; // Doesn't fit

        if (this.w == w && this.h == h)
        { // Exact fit
            this.inUse = true;
            varObj.renderPos = { x: this.x, y: this.y, w: w, h: h };
            return true;
        }
        // console.log(name + " fits, but not exactly (" + w + ", " + h + ") != (" + this.w + ", " + this.h + ")");
        // else the spot is big enough but needs to be split
        var dw = this.w - w;
        var dh = this.h - h;
        if (dw > dh)
        {
            this.left = new visualization_node(this.x, this.y, w, this.h);
            this.right = new visualization_node(this.x + w, this.y, this.w - w, this.h);
        }
        else
        {
            this.left = new visualization_node(this.x, this.y, this.w, h);
            this.right = new visualization_node(this.x, this.y + h, this.w, this.h - h);
        }

        this.left.insert(varObj, w, h);
        return true
    }
    else
    { // this node is not a leaf
        // Try left insert
        var result = this.left.insert(varObj, w, h);
        if (result == true)
            return result;
        // console.log("Could not insert " + name + " left, trying right...");
        // Left insert failed, try right
        return this.right.insert(varObj, w, h);
    }
}

// Credit pixi.js (MIT)
visualization.prototype._determineFontHeight = function (fontStyle) {
    var result = this.fontHeightCache[fontStyle];

    if (!result) {
        var body = document.getElementsByTagName('body')[0];
        var dummy = document.createElement('div');

        var dummyText = document.createTextNode('M');
        dummy.appendChild(dummyText);
        dummy.setAttribute('style', 'font:' + fontStyle + ';position:absolute;top:0;left:0');
        body.appendChild(dummy);
        result = dummy.offsetHeight;

        this.fontHeightCache[fontStyle] = result;
        body.removeChild(dummy);
        console.log("Variable visualization: Cached " + fontStyle + " = " + result);
    }

    return result;
};