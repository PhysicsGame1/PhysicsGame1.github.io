/**********************************************************************************************************************
  Data Structure of variable_visualization
 **********************************************************************************************************************
  Key                           Type          Meaning
    .font                       String        Font family name eg: 'Arial'
    .fontSize                   Integer       Font size in pixels
    .fontHeightCache[font]      Object        Cache for font heights that have already been calculated
    
    .outputCanvas               HTMLElement   The canvas to render on          
    .outputContext              --            2d canvas context
    
    .variables[varName]
      .value                    --            Value of this variable
      .options
        .roundingRule           Integer       Integer number of decimal places to round output to
        .useDelta               Boolean       Show an arrow indicating increasing or decreasing values
        .highlight              Boolean       Show value in a different color
        .visible                Boolean       Show or hide this variable
      .hideKeys                 Object        Holds information about blacklist of keys to be hidden if .value is an object
      .shownKeys                Object        Holds information about whitelist of keys to be shown if .value is an object
 **********************************************************************************************************************
  Notes:
  Functions beginning with _ underscore are for internal use.
  
  If the variable's value is an object, you are able to filter the keys that are displayed using 6 functions. If the
  variable is not an object, these functions will have no effect.
  On addHiddenKeys/removeHiddenKeys/clearHiddenKeys:
    These functions set up a blacklist. Keys in the blacklist will not be shown when rendering.
  On addShownKeys/removeShownKeys/clearShownKeys:
    These functions set up a whitelist. Keys in the whitelist will be rendered, and all other keys will not be rendered.
  
  Example usage, assuming the following code is used to setup the visualization. Each example occurs seperately.
  
  var vvis = new variable_visualization();
  var foo = {min:{x:0, y:0}, max:{x:1, y:1}};
  vvis.setVariable("bounds", foo);
  
  // Blacklisting the min output
  vvis.addHiddenKeys("bounds", ["min"]);
  Output:
    bounds
      .max
        .x=1
        .y=1

  // Blacklisting keys of nested objects 
  vvis.addHiddenKeys("bounds", ["min.x", "max"]);
  Output:
    bounds
      .min
        .y=0
  
  // Whitelisting the min output
  vvis.addShownKeys("bounds", ["min"]);
  Output:
    bounds
      .min
        .x=0
        .y=0
        
  // Whitelisting keys of nested objects 
  vvis.addHiddenKeys("bounds", ["min.x", "max"]);
  Output:
    bounds
      .min
        .x=0
      .max
        .x=1
        .y=1
 ***********************************************************************************************************************/

/************************************************************
 * Function: 
 * Parameters: 
 *    key - String name of the variable to set
 *    
 * What it does: 
 *    
 * Return value: None
 ************************************************************/
function variable_visualization()
{
  this.reset();
  this.fontHeightCache = {};

  this.font = 'Times New Roman';
  this.fontSize = 24;
	
	this.prevRenderTime = 0;
}

/************************************************************
 * Function: setCanvas
 * Parameters: 
 *    canvas - HTMLElement
 * What it does: 
 *    Sets the canvas the visualization renders to.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.setCanvas = function (canvas)
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
variable_visualization.prototype.reset = function()
{
	this.variables = {};
};

/************************************************************
 * Function: setVariable
 * Parameters: 
 *    key - String name of the variable to set
 *    value - New value of the variable
 * What it does: 
 *    Updates the value of a variable. Value can have any type,
 *    but objects are saved as references, not copied. If the
 *    variable does not exist, it will be created automatically.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.setVariable = function (key, value)
{
    if (key in this.variables)
    {
      var v = this.variables[key];
      v.value = value;
    }
    else
      this.createVariable(key, value);
};

/************************************************************
 * Function: createVariable
 * Parameters: 
 *    key - String name of the variable to set
 *    value - New value of the variable
 * What it does: 
 *    Creates a variable. It is not necessary to call this
 *    using a variable as it will be called automatically by
 *    other functions if needed.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.createVariable = function (key, value)
{
	if (!(key in this.variables))
	{
		this.variables[key] = { 
			value: value, 
			options: {
				roundingRule: 5,
				useDelta: false,
				highlight: false,
				visible: true
			},
			hideKeys: null,
			showKeys: null
    };
	}
};

/************************************************************
 * Function: setOption
 * Parameters: 
 *    key - String name of the variable to set
 *    option - String name of the option
 *    value - New value of the option
 * What it does: 
 *    Sets the value of a variable option. See top of file
 *    for a list of options. (.variable[varName].options)
 * Return value: None
 ************************************************************/
variable_visualization.prototype.setOption = function (key, option, value)
{
	this.createVariable(key);
	this.variables[key].options[option] = value;
};

/************************************************************
 * Function: unhighlightAll
 * What it does: 
 *    Removes highlighting from all variables
 * Return value: None
 ************************************************************/
variable_visualization.prototype.unhighlightAll = function ()
{
    for (var key in this.variables)
        this.variables[key].options.highlight = false;
};

/************************************************************
 * Function: setRoundingRule
 * Parameters: 
 *    key - String name of the variable to set
 *    decimals - Number of decimals to round to
 * What it does: 
 *    Sets the number of decimals that will be output when
 *    printing this variable. If the variable is an object,
 *    all subkeys will be printed with the same rule.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.setRoundingRule = function(key, decimals)
{
	this.createVariable(key);
	this.variables[key].options.roundingRule = decimals;
};

/************************************************************
 * Function: addHiddenKeys
 * Parameters: 
 *    key - String name of the variable to set
 *    hideKeys - Array
 * What it does: 
 *    Adds the values in hideKeys to the key blacklist. Keys
 *    added to the blacklist will not be shown when rendering.
 *    See notes at the top for details.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.addHiddenKeys = function(key, hideKeys)
{
	this.createVariable(key);
	if (this.variables[key].hideKeys == null)
		this.variables[key].hideKeys = {};
	for (var k in hideKeys)
		this.variables[key].hideKeys['.' + hideKeys[k]] = true;
};

/************************************************************
 * Function: removeHiddenKeys
 * Parameters: 
 *    key - String name of the variable to set
 *    hideKeys - Array
 * What it does: 
 *    Removes the values in hideKeys from the key blacklist.
 *    See notes at the top for details.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.removeHiddenKeys = function(key, hideKeys)
{
	this.createVariable(key);
	if (this.variables[key].hideKeys == null)
		this.variables[key].hideKeys = {};
	for (var k in hideKeys)
		this.variables[key].hideKeys['.' + hideKeys[k]] = false;
};

/************************************************************
 * Function: clearHiddenKeys
 * Parameters: 
 *    key - String name of the variable to set
 * What it does: 
 *    Resets the key blacklist.
 *    See notes at the top for details.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.clearHiddenKeys = function(key)
{
	this.createVariable(key);
	this.variables[key].hideKeys = null;
};

/************************************************************
 * Function: addShownKeys
 * Parameters: 
 *    key - String name of the variable to set
 *    showKeys - Array
 * What it does: 
 *    Adds the values in showKeys to the key whitelist. After
 *    adding to the whitelist, only the keys in the whitelist
 *    will be rendered.
 *    See notes at the top for details.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.addShownKeys = function(key, showKeys)
{
	this.createVariable(key);
	if (this.variables[key].showKeys == null)
		this.variables[key].showKeys = {};
	for (var k in showKeys)
		this.variables[key].showKeys['.' + showKeys[k]] = true;
};

/************************************************************
 * Function: removeShownKeys
 * Parameters: 
 *    key - String name of the variable to set
 *    showKeys - Array
 * What it does: 
 *    Removes the values in showKeys from the key whitelist.
 *    See notes at the top for details.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.removeShownKeys = function(key, showKeys)
{
	this.createVariable(key);
	if (this.variables[key].showKeys == null)
		this.variables[key].showKeys = {};
	for (var k in showKeys)
		this.variables[key].showKeys['.' + showKeys[k]] = false;
};

/************************************************************
 * Function: clearShownKeys
 * Parameters: 
 *    key - String name of the variable to set
 * What it does: 
 *    Resets the key whitelist.
 *    See notes at the top for details.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.clearShownKeys = function(key)
{
	this.createVariable(key);
	this.variables[key].showKeys = {};
};

/************************************************************
 * Function: render
 * What it does: 
 *    Renders the visualization on the selected canvas.
 * Return value: None
 ************************************************************/
variable_visualization.prototype.render = function()
{
  var x = 0, y = 0, w = this.outputCanvas.width, h = this.outputCanvas.height;
	var fontHeight = pixiGetFontHeight(this.fontSize + "px " + this.font);
	var ctx = this.outputContext;
	
	ctx.font = this.fontSize + "px " + this.font;
	
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
	
	ctx.fillStyle = 'black';
  ctx.fillRect(x, y, w, h);
	
	for (var key in this.variables)
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
	
	this.prevRenderTime = (new Date()).getTime();
};

/************************************************************
 *            Internal Functions
 ************************************************************/
variable_visualization.prototype._printObj = function(v, objName, obj, x, y, prevKey, bc)
{
	var fontHeight = pixiGetFontHeight(this.fontSize + "px " + this.font);
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
	
	for (key in obj)
	{
		// Determine if we should print this key
		thisKey = prevKey + '.' + key;
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
};

// Prints a box char string as monospaced even if the current font is not
variable_visualization.prototype._printBoxCharString = function(x, y, boxchar)
{
	var ctx = this.outputContext;
	var bcwidth = ctx.measureText('┼').width;
	for (var i = 0, len = boxchar.length; i < len; i++)
	{
		ctx.fillText(boxchar[i], x, y);
		x += bcwidth;
	}
	return x;
};

variable_visualization.prototype._round = function(v, decimals)
{
	//var v = this.variables[key].value
	if (v == Number(v) && v % 1 != 0) // v is float
		return +v.toFixed(decimals);
	return v;
};

variable_visualization.prototype._shouldDrawKey = function(v, key)
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
};

