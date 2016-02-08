/***********************************************************************
 *                      Matter.js Extra Functions
 ***********************************************************************/

// Pause or unpause the simulation
Matter.Engine.pause = function(engine)
{
	if (engine.paused == true)
	{
		engine.paused = false;
		engine.timing.timeScale = 1;
	}
	else
	{
		engine.paused = true;
		engine.timing.timeScale = 0;
	}
}

Matter.Body.setStyles = function(body, fillStyle, strokeStyle)
{
	body.render.fillStyle = fillStyle;
	body.render.strokeStyle = strokeStyle;
}

// If mass/density of the body is changed, this function can be used to set the inertia to the "default" value
Matter.Body.updateInertia = function(body)
{
  // orient vertices around the centre of mass at origin (0, 0)
  var centre = Matter.Vertices.centre(body.vertices);
  Matter.Vertices.translate(body.vertices, centre, -1);

  // update inertia while vertices are at origin (0, 0)
  Body.setInertia(body, Body._inertiaScale * Matter.Vertices.inertia(body.vertices, body.mass));

  // update geometry
  Matter.Vertices.translate(body.vertices, body.position);
  Matter.Bounds.update(body.bounds, body.vertices, body.velocity);
}

Matter.Body.redraw = function(engine, body)
{
	var bounds = engine.render.bounds;
	var options = engine.render.options;
	var boundsWidth = bounds.max.x - bounds.min.x,
		boundsHeight = bounds.max.y - bounds.min.y,
		boundsScaleX = boundsWidth / engine.render.options.width,
		boundsScaleY = boundsHeight / engine.render.options.height;
	var context = engine.render.context;
	context.scale(1 / boundsScaleX, 1 / boundsScaleY);
	context.translate(-bounds.min.x, -bounds.min.y);
	engine.render.controller.bodies(engine, [body], context);
	context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0);
}

/***********************************************************************
 *                      Matter.js Camera Class
 ***********************************************************************/
function matterjs_camera(matter_engine)
{
	this.engine = matter_engine;
	this.x = matter_engine.render.canvas.width / 2;
	this.y = matter_engine.render.canvas.height / 2;
	this.zoom = 1;
	this.track = null;
	// This option is required to make matter.js move the viewport
	matter_engine.render.options.hasBounds = true;
	// For .bind(this) explanation, see: http://stackoverflow.com/questions/20279484/how-to-access-the-correct-this-context-inside-a-callback
	Matter.Events.on(matter_engine, 'afterUpdate', this.update.bind(this));
}

// Translates the camera from its current position
matterjs_camera.prototype.translateCamera = function(xOffset, yOffset)
{
	this.x += xOffset; this.y += yOffset;
	this.update();
}

// Sets the camera to an absolute position
matterjs_camera.prototype.setCameraPos = function(newX, newY)
{
	this.x = newX; this.y = newY;
	this.update();
}

// Sets the camera to an absolute zoom
matterjs_camera.prototype.setZoom = function(newZoom)
{
	this.zoom = newZoom;
	this.update();
}

// Shifts the camera zoom from its current value
matterjs_camera.prototype.moveZoom = function(zoomOffset)
{
	this.zoom += zoomOffset;
	this.update();
}

// Track (camera follows) a matter.js body
matterjs_camera.prototype.trackBody = function(b)
{
	this.track = b;
}

// Clears tracked body. Camera position does not change.
matterjs_camera.prototype.clearTrackedBody = function()
{
	this.track = null;
}

// Sets the camera so that everything within the rectangle (xmin, ymin) -> (xmax, ymax) is in view
matterjs_camera.prototype.fitToBounds = function(xmin, xmax, ymin, ymax)
{
	this.x = (xmax + xmin) / 2;
	this.y = (ymax + ymin) / 2;
	var zw = -2 * (xmin - this.x) / this.engine.render.canvas.width;
	var zh = -2 * (ymin - this.y) / this.engine.render.canvas.height;
	this.zoom = Math.max(zw, zh);
}

// Calculates new viewport for matter.js. This should automatically be called by a matter.js event.
matterjs_camera.prototype.update = function()
{
	if (this.track != null)
	{
		this.x = this.track.position.x;
		this.y = this.track.position.y;
	}
	var render = this.engine.render;
	render.bounds.min.x = this.x - this.zoom * render.canvas.width * 0.5;
	render.bounds.min.y = this.y - this.zoom * render.canvas.height * 0.5;
	render.bounds.max.x = this.x + this.zoom * render.canvas.width * 0.5;
	render.bounds.max.y = this.y + this.zoom * render.canvas.height * 0.5;
}


/***********************************************************************
 *                      Matter.js Button Class
 ***********************************************************************/

 // onclick = function to call when button is clicked
 // options parameter is not required
function matterjs_button(matterjs_engine, text, x, y, onclick, options)
{
	var defaults = {
		enabled: true,
		visible: true,
		font: 'bold 16px Monospace',
		enabledFontColor: '#000000',
		enabledBackColor1: '#CCCCCC',
		enabledBackColor2: '#9999FF',
		mouseoverFontColor: '#000000',
		mouseoverBackColor: '#6666FF',
		disabledFontColor: '#444444',
		disabledBackColor: '#ACACAC',
		enabledOutlineColor: '#3333FF',
		disabledOutlineColor: '#444444',
		image: null,
		centered: false
	};
	this.options = Matter.Common.extend(defaults, options);

	this.text = text;
	this.x = x;
	this.y = y;
	this.onclick = onclick;
	
	if (this.options.image == null)
	{ // Determine button size from text size or options
		this.h = this.options.height || pixiGetFontHeight(ctx.font) + 15;
		var oldfont = ctx.font; ctx.font = this.options.font;
		this.w = this.options.width || ctx.measureText(text).width + 15;
		ctx.font = oldfont;
		if (this.options.centered)
		{
			this.x -= this.w / 2;
			this.y -= this.h / 2;
		}
	}
	else
	{ // Determine button size from image
		var i = this.options.image;
		if (typeof i == 'string')
		{ // i is a filename: load the image
			var temp = new Image();
			temp.src = i;
			i = this.options.image = temp;
		}
		
		if (i.src != '' && i.complete)
		{ // Image loaded
			this.h = this.options.h || i.height;
			this.w = this.options.w || i.width;
			if (this.options.centered)
			{
				this.x -= this.w / 2;
				this.y -= this.h / 2;
			}
		}
		else
		{ // Wait until image is loaded
			i.onload = function() {
				this.h = this.options.h || i.height;
				this.w = this.options.w || i.width;
				if (this.options.centered)
				{
					this.x -= this.w / 2;
					this.y -= this.h / 2;
				}
			}.bind(this);
		}
	}

	this.engine = matterjs_engine;
	this.mouseConstraint = Matter.MouseConstraint.create(matterjs_engine);
	//Matter.Events.on(this.mouseConstraint, 'mouseup', this.mouseup.bind(this));
	//Matter.Events.on(matterjs_engine, 'afterRender', this.draw.bind(this));
}

matterjs_button.prototype.mouseup = function()
{
	if (this.coordsInSelf(this.mouseConstraint.mouse.absolute) &&
		this.options.enabled && this.options.visible)
	{
		this.onclick();
		return true;
	}
	return false;
}

matterjs_button.prototype.draw = function()
{
	if (this.options.visible == false)
		return;
	var ctx = this.engine.render.context;
	var mouseOverButton = this.coordsInSelf(this.mouseConstraint.mouse.absolute);
	var mouseLeftClicking = this.mouseConstraint.mouse.button == 0;
	var opt = this.options;
	
	if (opt.image != null)
	{
		ctx.drawImage(opt.image, this.x, this.y, this.w, this.h); //opt.image.width, opt.image.height);
		return;
	}
	// Draw button
	if (opt.enabled)
	{
		var gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
		
		if (mouseOverButton)
		{
			if (mouseLeftClicking)
			{
				gradient.addColorStop(0, opt.mouseoverBackColor);
				gradient.addColorStop(1, opt.enabledBackColor1);
			}
			else
			{
				gradient.addColorStop(0, opt.enabledBackColor1);
				gradient.addColorStop(1, opt.mouseoverBackColor);
			}
		}
		else
		{
			gradient.addColorStop(0, opt.enabledBackColor1);
			gradient.addColorStop(1, opt.enabledBackColor2);
		}
		ctx.fillStyle = gradient;
		ctx.strokeStyle = opt.enabledOutlineColor;
	}
	else
	{
		ctx.fillStyle = opt.disabledBackColor;
		ctx.strokeStyle = opt.disabledOutlineColor;
	}
		
	ctx.roundRect(this.x, this.y, this.w, this.h, 5);
	ctx.fill(); ctx.stroke();
	
	// Draw text
	ctx.font = opt.font;
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	if (opt.enabled)
		ctx.fillStyle = mouseOverButton ? opt.mouseoverFontColor : opt.enabledFontColor;
	else
		ctx.fillStyle = opt.disabledFontColor;
	var texth = pixiGetFontHeight(ctx.font);
	var textw = ctx.measureText(this.text).width;
	ctx.fillText(this.text, this.x + (this.w - textw) / 2, this.y + (this.h - texth) / 2, this.w);
}

matterjs_button.prototype.coordsInSelf = function(pt)
{
	return (pt.x >= this.x && pt.x <= this.x + this.w && pt.y >= this.y && pt.y <= this.y + this.h)
}