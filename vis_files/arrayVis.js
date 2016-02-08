
// Begin the visualization : add "name" to World Object Array
// callback is a function that will be called with this animation completes
function arrayVis_insert(name, callback)
{
	arrayVis_stop("cancelled");
	arrayVis_insert.callback = callback;
	arrayVis_insert.objname = name;
	arrayVis_update.x = 25; arrayVis_update.y = 75;
	
	arrayVis_drawArray(name, arrayVis_insert.nextIndex);
	
	arrayVis_insert.nextIndex += 1;
	arrayVis_insert.interval = setInterval(arrayVis_update, 30);
}
arrayVis_insert.nextIndex = 0;
arrayVis_insert.interval = 0;

// Is the visualization ready to accept another object/ done with current animation?
function arrayVis_ready()
{
	return arrayVis_insert.interval == 0;
}

// Step the visualization to the next frame
function arrayVis_update()
{
	var speed = DEBUG ? 560 : 10;
	var targetIndex = arrayVis_insert.nextIndex - 1;
	var startIndex = targetIndex > 8 ? targetIndex - 8 : 0;
	var ytarget = 75 + (targetIndex - startIndex) * 50;
	var xtarget = 350;

	var canvas, c;
	if (arrayVis_enableRender.rendering)
	{
		canvas = document.getElementById("v_canvas");
		c = canvas.getContext("2d");
		c.fillStyle = "black";
		c.fillRect(arrayVis_update.x, arrayVis_update.y, 40, 40);
	}
	
	if (arrayVis_update.y == ytarget)
	{
		arrayVis_update.x += speed;
		if (arrayVis_update.x >= xtarget)
			arrayVis_update.x = xtarget;
	}
	else
	{
		arrayVis_update.y += speed;
		if (arrayVis_update.y >= ytarget)
			arrayVis_update.y = ytarget
	}

	if (arrayVis_enableRender.rendering)
	{
		c.fillStyle = "blue";
		c.fillRect(arrayVis_update.x, arrayVis_update.y, 40, 40);
	}
	if (arrayVis_update.y == ytarget && arrayVis_update.x == xtarget)
		arrayVis_stop("finished");
}

// Clear the visualization to a fresh state
function arrayVis_reset()
{
	arrayVis_insert.nextIndex = 0;
	arrayVis_insert.callback = null;
	arrayVis_stop("reset");
	if (arrayVis_enableRender.rendering)
	{
		var canvas = document.getElementById("v_canvas");
		var c = canvas.getContext("2d");
		c.fillStyle = "black";
		c.fillRect(0, 0, canvas.width, canvas.height);
	}
}

// Stop updating the canvas and inform the callback function if necessary
function arrayVis_stop(reason)
{
	if (arrayVis_insert.interval != 0)
	{
		clearInterval(arrayVis_insert.interval);
		arrayVis_insert.interval = 0;
		if (typeof arrayVis_insert.callback == 'function')
			arrayVis_insert.callback(typeof reason == 'undefined' ? 'stop' : reason);
	}
}

// Note: untested
// Continues a stopped visualization
function arrayVis_continue()
{
	if (arrayVis_insert.interval == 0)
		arrayVis_insert.interval = setInterval(arrayVis_update, 30);
}

// Runs when user clicks array vis tab
// Enables this visualization to use the canvas and disables variable visualization
function arrayVis_enableRender()
{
	arrayVis_enableRender.rendering = true;
	bRenderVars = false;
	renderCF = false;
	arrayVis_drawArray(arrayVis_insert.objname, arrayVis_insert.nextIndex-1);
}
arrayVis_enableRender() // This is the default visualization


// Internal use only
// Draws the array up to index
function arrayVis_drawArray(name, index)
{
	var canvas = document.getElementById("v_canvas");
	var c = canvas.getContext("2d");
	
	c.fillStyle = "black";
	c.fillRect(0, 0, canvas.width, canvas.height);

	c.font = "20px Georgia";
	c.textAlign = 'left'; c.textBaseline = 'top';
	c.fillStyle = "white";
	c.fillText("World Object Array" ,300, 50, 300);
	c.fillText("Inserting: " + name , 10, 50, 300);

	var startIndex = index > 8 ? index - 8 : 0;
	var i;
	for(i = startIndex ; i < index; i++)
	{
		c.fillStyle = "yellow";
		c.fillRect(350, 75 + (i-startIndex)*50, 40, 40);
		c.fillStyle = "white";
		c.fillText(i, 400, 80 + (i-startIndex)*50);
	}
	c.fillText(i, 400, 80 + (i-startIndex)*50);

	c.fillStyle = "blue";
	c.fillRect(arrayVis_update.x, arrayVis_update.y, 40, 40);
}