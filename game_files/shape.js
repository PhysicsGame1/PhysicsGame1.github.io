// Point constructor
function Point(x, y)
{
    this.x = x;
    this.y = y;
}

// Transforms this point by:
//   Rescaling point by (xScale, yScale)
//   Rotating counter-clockwise by 'radiansAngle' radians about the point (xOrigin, yOrigin)
//   Translating to (xOffset, yOffset)
Point.prototype.transform = function (xOffset, yOffset, radiansAngle, xScale, yScale, xOrigin, yOrigin)
{
    // Precalculate
    var cos = Math.cos(radiansAngle);
    var sin = Math.sin(radiansAngle);

    // Change current point to be relative to xOrigin, yOrigin
    var x = xScale * (this.x - xOrigin);
    var y = yScale * (this.y - yOrigin);

    // Rotation calculation
    var tx = x * cos - y * sin;
    var ty = x * sin + y * cos;

    return new Point(tx + xScale * xOrigin + xOffset, ty + yScale * yOrigin + yOffset);
}

// Shape constructor
// Canvas is the render target for Shape.drawSelf()
// points is an array of Point objects, defining the vertices of this shape
// invertYAxis (default=true) determines if the Y-axis should be inverted when rendering (ie: pixel 0 is at the bottom of the canvas)
function Shape(canvas, points, invertYAxis)
{
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.points = points;
    this.invertYAxis = typeof invertYAxis !== 'undefined' ? invertYAxis : true;

    // Calculate the 'center' of the object by averaging the x,y values of each point
    var xSum = 0;
    var ySum = 0;
    for (var i in points)
    {
        xSum += points[i].x;
        ySum += points[i].y;
    }

	//center is just average of sum of x and y coords
    this.xCenter = xSum / points.length;
    this.yCenter = ySum / points.length;

    this.centerPt = new Point(this.xCenter, this.yCenter);

    // Set defaults
    this.xScale = 1;
    this.yScale = 1;
    this.xPos = 0;
    this.yPos = 0;
    this.rAngle = 0;
	//extra components added treat as mks units
	this.mass = 1;
	this.xVel = 0;
	this.yVel = 0;
	this.xAccel = 0;
	this.yAccel = 0;

    this.pathValid = false;
    this.updatePath();

    this.fillStyle = 'white';
    this.strokeStyle = 'black';
}

//set mass of this shape
Shape.prototype.setMass = function(mass)
{
    this.mass = mass;
    this.pathValid = false;
}

// Set the velocity of this shape
Shape.prototype.setVel = function(xVel, yVel)
{
    this.xVel = xVel;
    this.yVel = yVel;
    this.pathValid = false;
}

// Set the acceleration of this shape
Shape.prototype.setAccel = function(xAccel, yAccel)
{
    this.xAccel = xAccel;
    this.yAccel = yAccel;
    this.pathValid = false;
}
// Set the scale (stretch) of this shape
Shape.prototype.setScale = function(xScale, yScale)
{
    this.xScale = xScale;
    this.yScale = yScale;
    this.pathValid = false;
}

// Set the center of this shape
// The shape is rotated about this point
Shape.prototype.setCenter = function(x, y)
{
    this.xCenter = x;
    this.yCenter = y;
    this.centerPt = new Point(x, y);
    this.pathValid = false;
}

// Set the position of this shape
// Note: The center of the object will appear at this coordinate
Shape.prototype.setPos = function(x, y)
{
    this.xPos = x;
    this.yPos = y;
    this.pathValid = false;
}

// Set the position of this shape using canvas coordinates
Shape.prototype.setCanvasPos = function(x, y)
{
    this.xPos = x - this.xScale * this.xCenter;
    this.yPos = (this.invertYAxis ? this.canvas.height - y : y) - this.yScale * this.yCenter;
    this.pathValid = false;
}

// Set the rotation of this shape
Shape.prototype.setAngle = function(radiansAngle)
{
    this.rAngle = radiansAngle;
    this.pathValid = false;
}

// Updates this shape's canvas Path2D object (used for drawing and hit tests)
Shape.prototype.updatePath = function ()
{
    // Do not recalculate path if it has not changed
    if (this.pathValid)
        return;

    this.canvasPointsCache = [];

    var num_points = this.points.length;
    this.path = new Path2D();

    // First point is special case (moveTo rather than lineTo)
    var s = this._transform(this.points[0])
    this.path.moveTo(s.x, s.y)

    // Save transformed point
    this.canvasPointsCache.push(s);

    // For each remaining point, draw a line to the next point
    for (var i = 1; i < num_points; i++) {
        var p = this._transform(this.points[i])
        this.path.lineTo(p.x, p.y);
        this.canvasPointsCache.push(p);
    }

    this.canvasPointsCache.push(s);

    // Draw a line back to the start point
    this.path.closePath();

    // Draw a line to the center of the shape
    c = this._transform(this.centerPt);
    this.path.lineTo(c.x, c.y);

    // Mark this path as up to date
    this.pathValid = true;
}

// Helper for transforming points
Shape.prototype._transform = function(pt)
{
    return pt.transform(this.xPos
                      , this.invertYAxis ? this.canvas.height - this.yPos : this.yPos
                      , this.rAngle
                      , this.xScale
                      , this.invertYAxis ? -this.yScale : this.yScale
                      , this.xCenter
                      , this.yCenter);
}

// Draw this shape to the canvas passed to the constructor
Shape.prototype.drawSelf = function ()
{
    this.updatePath();

    // Save old fill and stroke style
    var oldFill = this.ctx.fillStyle;
    var oldStroke = this.ctx.strokeStyle;

    // Set new colors
    this.ctx.fillStyle = this.fillStyle;
    this.ctx.strokeStyle = this.strokeStyle;

    // Draw
    this.ctx.fill(this.path);
    this.ctx.stroke(this.path);

    // Restore old colors
    this.ctx.fillStyle = oldFill;
    this.ctx.strokeStyle = oldStroke;
}

// Returns true if the point (x, y) is within this shape
// (x, y) are pixel coordinates inside the current canvas context
Shape.prototype.hitTest = function (x, y)
{
    this.updatePath();
    return this.ctx.isPointInPath(this.path, x, y);
}

// Credit: http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
function get_line_intersection(p0, p1, p2, p3)
{
    var s1_x = p1.x - p0.x; var s1_y = p1.y - p0.y;
    var s2_x = p3.x - p2.x; var s2_y = p3.y - p2.y;

    var s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / (-s2_x * s1_y + s1_x * s2_y);
    var t = (s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        // Collision detected at
        //  var intersectionPt = new Point(p0.x + (t * s1_x), p0.y + (t * s1_y));
        return true;
    }

    return false; // No collision
}

// Returns true if a line in that (another shape object) intersects a line in this shape
Shape.prototype.checkCollision = function (that)
{
    if (this == that)
        return false;  // passed shape is self - no collision
    
    var num_points_this = this.canvasPointsCache.length;
    var num_points_that = that.canvasPointsCache.length;

    // Check if that shape's vertices are within this shape
  /*  for (var b = 1; b < num_points_that; b++)
    {
        var pt = that.canvasPointsCache[b];
        if (this.hitTest(pt.x, pt.y))
            return true;  // Collision detected
    }*/

    // Check if a line from that shape crosses a line from this shape
    for (var a = 1; a < num_points_this; a++)
    {
        var ap0 = this.canvasPointsCache[a];
        var ap1 = this.canvasPointsCache[a - 1];

        for (var b = 1; b < num_points_that; b++)
        {
            var bp0 = that.canvasPointsCache[b];
            var bp1 = that.canvasPointsCache[b - 1];
            if (get_line_intersection(ap0, ap1, bp0, bp1))
                return true // Collision detected
        }
    }
    return false; // All points checked without collision
}

