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
};

Matter.Body.setStyles = function(body, fillStyle, strokeStyle)
{
	body.render.fillStyle = fillStyle;
	body.render.strokeStyle = strokeStyle;
};

// If mass/density of the body is changed, this function can be used to set the inertia to the "default" value
Matter.Body.updateInertia = function(body)
{
  // orient vertices around the centre of mass at origin (0, 0)
  var centre = Matter.Vertices.centre(body.vertices);
  Matter.Vertices.translate(body.vertices, centre, -1);

  // update inertia while vertices are at origin (0, 0)
  Matter.Body.setInertia(body, Matter.Body._inertiaScale * Matter.Vertices.inertia(body.vertices, body.mass));

  // update geometry
  Matter.Vertices.translate(body.vertices, body.position);
  Matter.Bounds.update(body.bounds, body.vertices, body.velocity);
};

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
};

Matter.Body.disableCollisions = function(body)
{
	body.collisionFilter.mask = 0;
};

Matter.Body.enableCollisions = function(body)
{
	body.collisionFilter.mask = 0xFFFFFFFF;
};

Matter.Body.drawAt = function(engine, body, context, x, y, size)
{
	var c = context,
		render = engine.render,
		part,
		i,k;	
	// Calculate scale
	var scale;
	if (body.circleRadius)
	{
		scale = size / (2 * body.circleRadius);
	}
	else
	{
		// Calculate body bounds through vertices
		// Note: Cannot use body.bounds as it does not give the correct results in negative coordinates
		var max_width = 0;
		for (i = 0; i < body.vertices.length; i++)
		{
			for (j = i+1; j < body.vertices.length; j++)
			{
				var v1 = body.vertices[i];
				var v2 = body.vertices[j];
				var dist = Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2);
				if (dist > max_width)
					max_width = dist;
			}
		}
		scale = size / Math.sqrt(max_width);
	}
	var bx = body.position.x;
	var by = body.position.y;
	
	// handle compound parts
	for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++)
	{
		part = body.parts[k];

		if (part.render.sprite && part.render.sprite.texture)
		{
			// part sprite
			var sprite = part.render.sprite;
			var texture = render.textures[sprite.texture];

			c.translate(part.position.x - bx + x, part.position.y - by + y); 
			c.rotate(part.angle);
			c.scale(scale,scale);
			
			c.drawImage(
				texture,
				texture.width * -sprite.xOffset * sprite.xScale, 
				texture.height * -sprite.yOffset * sprite.yScale, 
				texture.width * sprite.xScale, 
				texture.height * sprite.yScale
			);

			// revert translation, hopefully faster than save / restore
			c.scale(1 / scale,1 / scale);
			c.rotate(-part.angle);
			c.translate(-(part.position.x - bx + x), -(part.position.y - by + y)); 
			
		} 
		else
		{
			c.translate(x, y);
			c.scale(scale,scale);
			
			// part polygon
			if (part.circleRadius)
			{
				c.beginPath();
				c.arc(part.position.x - bx, part.position.y - by, part.circleRadius, 0, 2 * Math.PI);
			}
			else
			{
				c.beginPath();
				c.moveTo(part.vertices[0].x - bx, part.vertices[0].y - by);
				for (var j = 1; j < part.vertices.length; j++)
				{
					c.lineTo(part.vertices[j].x - bx, part.vertices[j].y - by);
				}
				c.closePath();
			}

			c.fillStyle = part.render.fillStyle;
			c.lineWidth = part.render.lineWidth;
			c.strokeStyle = part.render.strokeStyle;
			c.fill();
			c.stroke();
			
			c.scale(1 / scale,1 / scale);
			c.translate(-x, -y);
		}
	}
};

/***********************************************************************
 *                      Matter.js Camera Class
 ***********************************************************************/
function matterjs_camera(matter_engine)
{
	this.engine = matter_engine;
	this.x = 0;
	this.y = 0;
	this.z = 1;
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
};

// Sets the camera to an absolute position
matterjs_camera.prototype.setCameraPos = function(newX, newY)
{
	this.x = newX; this.y = newY;
};

// Sets the camera to an absolute zoom
matterjs_camera.prototype.setZoom = function(newZoom)
{
	this.z = newZoom;
};

// Shifts the camera zoom from its current value
matterjs_camera.prototype.moveZoom = function(zoomOffset)
{
	this.z += zoomOffset;
};

// Track (camera follows) a matter.js body
matterjs_camera.prototype.trackBody = function(b)
{
	this.track = b;
};

// Clears tracked body. Camera position does not change.
matterjs_camera.prototype.clearTrackedBody = function()
{
	this.track = null;
};

// Sets the camera so that everything within the rectangle (xmin, ymin) -> (xmax, ymax) is in view
matterjs_camera.prototype.fitToBounds = function(xmin, xmax, ymin, ymax)
{
	this.x = (xmax + xmin) / 2;
	this.y = (ymax + ymin) / 2;
	this.z = Math.max(xmax - this.x, ymax - this.y);
	//console.log('Camera moved to: ' + this.x + ',' + this.y + ',' + this.z);
};

// Calculates new viewport for matter.js. This should automatically be called by a matter.js event.
matterjs_camera.prototype.update = function()
{
	var render = this.engine.render;
	
	if (this.track != null)
	{
		this.x = this.track.position.x;
		this.y = this.track.position.y;
	}

	render.options.width = render.canvas.width;
	render.options.height = render.canvas.height;
	
	var r = render.canvas.height / render.canvas.width;

	render.bounds.min.x = this.x - Math.max(r,1) * this.z;
	render.bounds.max.x = this.x + Math.max(r,1) * this.z;
	render.bounds.min.y = this.y - Math.min(r,1) * this.z;
	render.bounds.max.y = this.y + Math.min(r,1) * this.z;
};


/***********************************************************************
 *                      Canvas Button Class
 ***********************************************************************/

 // onclick = function to call when button is clicked
 // options parameter is not required
function canvas_button(canvas, text, x, y, onclick, options)
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
	var ctx = canvas.getContext('2d');
	this.options = Matter.Common.extend(defaults, options);

	this.text = text;
	this.onclick = onclick.bind(this);
	
	if (this.options.image == null)
	{ // Determine button size from text size or options
		this.h = this.options.height || pixiGetFontHeight(ctx.font) + 15;
		var oldfont = ctx.font; ctx.font = this.options.font;
		this.w = this.options.width || ctx.measureText(text).width + 15;
		ctx.font = oldfont;
		this.move(x, y);
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
			this.move(x, y);
		}
		else
		{ // Wait until image is loaded
			i.onload = function() {
				this.h = this.options.h || i.height;
				this.w = this.options.w || i.width;
				this.move(x, y);
			}.bind(this);
		}
	}
	this.ctx = canvas.getContext('2d');
	this.mouse = Matter.Mouse.create(canvas);
}

canvas_button.prototype.move = function(x, y)
{
	this.x = x; this.y = y;
	if (this.options.centered)
	{
		this.x -= this.w / 2;
		this.y -= this.h / 2;
	}
};

canvas_button.prototype.mouseup = function()
{
	if (this.coordsInSelf(this.mouse.absolute) &&
		this.options.enabled && this.options.visible)
	{
		this.onclick();
		return true;
	}
	return false;
};

canvas_button.prototype.draw = function()
{
	if (this.options.visible == false)
		return;
	var ctx = this.ctx;
	var mouseOverButton = this.coordsInSelf(this.mouse.absolute);
	var mouseLeftClicking = this.mouse.button == 0;
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
};

canvas_button.prototype.coordsInSelf = function(pt)
{
	return (pt.x >= this.x && pt.x <= this.x + this.w && pt.y >= this.y && pt.y <= this.y + this.h);
};