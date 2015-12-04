/* Outdated...
    visualization
        .font                   Font family name eg: 'Arial'
        .fontHeightCache[font]  Cache for font heights that have already been calculated
        .fontSize               Font size in pixels
        .outputCanvas           canvas to render on          
        .outputContext          2d canvas context
        .outsideMargins         Pixels size of margins outside of variable box
        .variables[key]
            .value              value of this key


*/

// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D

function visualization()
{
    this.variables = {};
    this.fontHeightCache = {};

    this.font = 'Times New Roman';
    this.fontSize = 24;
	
	this.prevRenderTime = 0;
}

// vis.setCanvas( document.getElementById('visualizeCanvas') );
visualization.prototype.setCanvas = function (canvas)
{
    this.outputCanvas = canvas;
    this.outputContext = canvas.getContext('2d');
};

visualization.prototype.setVariable = function (key, value)
{
    if (key in this.variables)
    {
        var v = this.variables[key];
		v.value = value;
    }
    else
		this.createVariable(key, value);
};

visualization.prototype.createVariable = function (key, value)
{
	if (!(key in this.variables))
	{
		this.variables[key] = { 
			value: value, 
			options: {
				roundingRule: 100000,
				useDelta: false,
				highlight: false,
				visible: true
			},
			hideKeys: null,
			showKeys: null
			};
	}
}

visualization.prototype.setOption = function (key, option, value)
{
	this.createVariable(key)
	this.variables[key].options[option] = value;
};

visualization.prototype.unhighlightAll = function ()
{
    for (key in this.variables)
        this.variables[key].options.highlight = false;
};

visualization.prototype.setRoundingRule = function(key, decimals)
{
	this.createVariable(key)
	this.variables[key].options.roundingRule = Math.pow(10, decimals);
}

visualization.prototype.addHiddenKeys = function(key, hideKeys)
{
	this.createVariable(key)
	if (this.variables[key].hideKeys == null)
		this.variables[key].hideKeys = {};
	for (k in hideKeys)
		this.variables[key].hideKeys['.' + hideKeys[k]] = true;
}

visualization.prototype.removeHiddenKeys = function(key, hideKeys)
{
	this.createVariable(key)
	if (this.variables[key].hideKeys == null)
		this.variables[key].hideKeys = {};
	for (var k in hideKeys)
		this.variables[key].hideKeys['.' + hideKeys[k]] = false;
}

visualization.prototype.clearHiddenKeys = function(key)
{
	this.createVariable(key)
	this.variables[key].hideKeys = null;
}

visualization.prototype.addShownKeys = function(key, showKeys)
{
	this.createVariable(key)
	if (this.variables[key].showKeys == null)
		this.variables[key].showKeys = {};
	for (k in showKeys)
		this.variables[key].showKeys['.' + showKeys[k]] = true;
}

visualization.prototype.removeShownKeys = function(key, showKeys)
{
	this.createVariable(key)
	if (this.variables[key].showKeys == null)
		this.variables[key].showKeys = {};
	for (var k in showKeys)
		this.variables[key].showKeys['.' + showKeys[k]] = false;
}

visualization.prototype.clearShownKeys = function(key)
{
	this.createVariable(key)
	this.variables[key].showKeys = {};
}

//ctx.measureText(this._formatValue(key)).width
visualization.prototype.render = function(x, y, w, h)
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
		var opts = v.options;
		
		// Draw this variable?
		if (opts.visible == false)
			continue;
		
		// Set text color
		if (opts.highlight)
			ctx.fillStyle = 'yellow';
		else
			ctx.fillStyle = 'white';
		
		
		if (typeof v.value == 'object' && v.value != null)
		{ // Object or array
			y = this._printObj(v, key, v.value, x + 10, y, '', '');
		}
		else
		{
			ctx.fillText(key + " = " + this._round(v.value, opts.roundingRule), x + 10, y);
			y += fontHeight;
		}	
	}
	
	ctx.oldtextAlign = ctx.textAlign;
	ctx.textBaseline = oldtextBaseline;
	this.prevRenderTime = (new Date()).getTime();
}

visualization.prototype._printObj = function(v, objName, obj, x, y, prevKey, bc)
{
	var fontHeight = this._determineFontHeight(this.fontSize + "px " + this.font);
	var ctx = this.outputContext;
	// Determine the last key to be enumerated..
	var last;
	for (var key in obj)
	{
		var thisKey = prevKey + '.' + key;
		if (!this._shouldDrawKey(v, thisKey))
			continue;
		last = key;
	}
	// Print self name
	ctx.fillText(objName + '.', this._printBoxCharString(x, y, bc), y);
	y += fontHeight;
	
	for (var key in obj)
	{
		// Determine if we should print this key
		var thisKey = prevKey + '.' + key;
		if (!this._shouldDrawKey(v, thisKey))
			continue;
		
		// Determine which box char to use, and print it
		var xb;
		if (key == last)
			xb = this._printBoxCharString(x, y, bc + '└');
		else
			xb = this._printBoxCharString(x, y, bc + '├');
		
		// Print the key name and value
		if (typeof obj[key] == 'object' && obj[key] != null)
		{
			y = this._printObj(v, key, obj[key], x, y, thisKey, key == last ? bc + ' ' : bc + '│');
		}
		else
		{
			ctx.fillText(key + " = " + this._round(obj[key], v.options.roundingRule), xb, y);
			y += fontHeight;
		}
	}
	
	return y;
}

// Prints a box char string as monospaced even if the current font is not
visualization.prototype._printBoxCharString = function(x, y, boxchar)
{
	var ctx = this.outputContext;
	var bcwidth = ctx.measureText('┼').width;
	for (var i = 0, len = boxchar.length; i < len; i++)
	{
		ctx.fillText(boxchar[i], x, y);
		x += bcwidth;
	}
	return x;
}

visualization.prototype._round = function(v, rr)
{
	//var v = this.variables[key].value
	if (v == Number(v) && v % 1 != 0) // v is float
		return Math.round(v * rr) / rr;
	else
		return v;
}

visualization.prototype._shouldDrawKey = function(v, key)
{
	if (v.hideKeys != null && v.hideKeys[key] == true)
		return false;
	if (v.showKeys != null)
	{
		for(var k in v.showKeys)
		{
			if ((key + '.').indexOf(k + '.') == 0)
				return true;
			if ((k + '.').indexOf(key + '.') == 0)
				return true;
		}
		return false;
	}
	return true;
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