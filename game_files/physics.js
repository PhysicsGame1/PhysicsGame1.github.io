
        var canvas = document.getElementById('physicsCanvas');
        var ctx = canvas.getContext('2d');
		var allShapes = []; //this holds every shape and accessible to every function


		createBorder(); //create border for canvas (first 4 slots are border)
		createCannon(); //create barrel, wheel of cannon,
		createLevel(1); // create level
		createBall(); //Creates cannonball needs to be seperated for kinematics
		//all shapes must have acceleration, velocity, position, and angle?
		
        // Function to update and save current mouse position, relative to canvas upper left corner
        var xMouse; var yMouse;

        var draggedallShapes = undefined;
        // Function to grab an allShapes
        function mousedown(event)
        {
            var rect = canvas.getBoundingClientRect();
            xMouse = event.clientX - rect.left;
            yMouse = event.clientY - rect.top;

            for(i in allShapes)
            {
                if (allShapes[i].hitTest(xMouse, yMouse))
                {
                    draggedallShapes = allShapes[i];
                    return;
                }
            }
        }

        function mouseup(event)
        {
            draggedallShapes = undefined;
        }

        function mousemove(event) {
            var rect = canvas.getBoundingClientRect();
            xMouse = event.clientX - rect.left;
            yMouse = event.clientY - rect.top;
            if (draggedallShapes !== undefined)
                draggedallShapes.setCanvasPos(xMouse, yMouse);
        }

		//draws on canvas
        function render(lastTime)
        {
			var rad_per_second = Math.PI / 6;       // radians angle change per second (angular velocity)
			var curtime = (new Date()).getTime();
			var deltaTime = (curtime - lastTime)*.001; //time is in ms so convert to seconds

            // Erase canvas and add a border to it
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'black';
            ctx.strokeRect(0, 0, canvas.width, canvas.height);

            // Add a hint
            ctx.font = '20px Consolas';
            ctx.fillStyle = 'black';
            ctx.fillText('Physics simulator v1', 10, 40);

            // Set current rotation 
            //allShapes[0].setAngle(-time * rad_per_second);
			//allShapes[1].setAngle(time * rad_per_second);

			//update positions of all shapes
			var xNewPos;
			var yNewPos;
			var oldxVel;
			var oldyVel;
			var avgxVel;
			var avgyVel;
			var shape;
			
			for(a in allShapes)
			{
				shape = allShapes[a];
				
				//if shape can't move don't calculate (helps fps surprisingly)
				if(shape.xVel == 0 && shape.yVel == 0 && shape.xAccel == 0 && shape.yAccel == 0)
					continue;
				
				//save old components of velocity
				oldxVel = shape.xVel;
				oldyVel = shape.yVel;
				
				//calculate new velocity given acceleration of object
				shape.xVel = shape.xVel + shape.xAccel * deltaTime;				
				shape.yVel = shape.yVel + shape.yAccel * deltaTime;				
				
				//calculate average distance
				avgxVel = 0.5 * (oldxVel + shape.xVel);
				avgyVel = 0.5 * (oldyVel + shape.yVel);
				
				
				xNewPos = shape.xPos + avgxVel * deltaTime;
				yNewPos = shape.yPos + avgyVel * deltaTime;
								
				//shape.setAngle(curtime * rad_per_second);
				//console.log(shape.xVel);
				shape.setPos(xNewPos,yNewPos);
			}
			
			
            // Do collision tests
            for (a in allShapes)
			{
				shape = allShapes[a];
				//if shape can't move don't see if it hit anything (helps fps surprisingly)
				//this should basically catch everything BUT the cannonball
				if(shape.xVel == 0 && shape.yVel == 0 && shape.xAccel == 0 && shape.yAccel == 0)
					continue;
                for (b in allShapes)
                {
                    if (shape.checkCollision(allShapes[b]))
					{
						calcCollision(shape, allShapes[b]);
                        shape.fillStyle = 'red';
					}
                }
            }

            // Draw all shapes
            for (i in allShapes)
            {
                allShapes[i].drawSelf();
                allShapes[i].fillStyle = 'black';
            }
             
			//from timeing test use Mozilla Web Dev tools we average like 41 fps using setTimeout
			//even though we calculated it to run at 60 fps
			requestAnimFrame(function () { render(curtime); });
        }
		
	function calcCollision(shapeOne, shapeTwo)
	{
		//math too hard
		//https://en.wikipedia.org/wiki/Reflection_%28mathematics%29#Reflection_across_a_line_in_the_plane
		//https://gamedev.stackexchange.com/questions/48587/resolving-a-collision-with-forces
		//https://stackoverflow.com/questions/345838/ball-to-ball-collision-detection-and-handling
		//https://stackoverflow.com/questions/573084/how-to-calculate-bounce-angle (most useful)
		//https://stackoverflow.com/questions/1243614/how-do-i-calculate-the-normal-vector-of-a-line-segment (calculate normal for 2D)
	
		//find the line described as 2 points bp0 and bp1?
		var num_points_this = shapeOne.canvasPointsCache.length;
		var num_points_that = shapeTwo.canvasPointsCache.length;
		
		// Find line that intersects this shape
		for (var a = 1; a < num_points_this; a++)
		{
			var ap0 = shapeOne.canvasPointsCache[a];
			var ap1 = shapeOne.canvasPointsCache[a - 1];

			for (var b = 1; b < num_points_that; b++)
			{
				var bp0 = shapeTwo.canvasPointsCache[b];
				var bp1 = shapeTwo.canvasPointsCache[b - 1];
				if (get_line_intersection(ap0, ap1, bp0, bp1))
				{
					//get slope of line and slope of velocity
					var diffX = ap1.x - ap0.x;
					var diffY = ap1.y - ap0.y;
					//now do perpendicular vector = n*(v dot n)/(n dot n)
					//parallel vector = velocity vector - perpendicular vector
					var normalX = diffX;
					var normalY = -diffY;
					var velDotNormal = shapeOne.xVel * normalX + shapeOne.yVel * normalY;
					var normalDotNormal = normalX * normalX + normalY * normalY;
					var scalar = velDotNormal / normalDotNormal;
					var perpendicularCompX = normalX * scalar;
					var perpendicularCompY = normalY * scalar;
					var parallelCompX = shapeOne.xVel - perpendicularCompX;
					var parallelCompY = shapeOne.yVel - perpendicularCompY;
					//resulting velocity is parallel - perpendicular
					shapeOne.xVel = parallelCompX - perpendicularCompX;
					shapeOne.yVel = parallelCompY - perpendicularCompY;
					return;
				}
			}
		}
		//something wrong if it gets here since it should have changed velocity
	}
	
	
    // Define a circle and rectangle for cannon
	function createCannon()
		{
			var pts = [];
			for (i = 0; i < 2 * Math.PI; i += Math.PI / 15)
				pts.push(new Point(Math.cos(i), Math.sin(i)));
		  
			var circle = new Shape(canvas, pts);

			circle.setScale(16, 16);
			circle.setPos(circle.xScale, circle.yScale);
			circle.setCenter(0, 0);
			
			circle.setVel(0, 0);
			circle.setAccel(0, 0);
			circle.setMass(100);
			
			// Define a rectangle
			var p1 = new Point(-1, -1);
			var p2 = new Point(1, -1);
			var p3 = new Point(1, 1);
			var p4 = new Point(-1, 1);
			var rect = new Shape(canvas, [p1, p2, p3, p4]);
			rect.setScale(8, 32);
			rect.setPos(circle.xScale * 2, circle.yScale * 2)
			rect.setCenter(0,0);
			rect.setAngle(Math.PI * 45 / 180); //angle is in degrees
			
			rect.setVel(0, 0);
			rect.setAccel(0, 0);
			rect.setMass(100);

			allShapes.push(rect); //push barrel first so wheel overwrites part of it
			allShapes.push(circle);		
		
		}
		
	function createBall()
		{
			var pts = [];
			for (i = 0; i < 2 * Math.PI; i += Math.PI / 15)
				pts.push(new Point(Math.cos(i), Math.sin(i)));
		  
			var circle = new Shape(canvas, pts);
			circle = new Shape(canvas, pts);
			circle.setScale(8, 8);
			circle.setPos(8 * circle.xScale, 8 * circle.yScale);
			
			circle.setVel(64, 64);
			circle.setAccel(0, 0);
			circle.setMass(20);
			
			allShapes.push(circle);			
		}		
		
	// Define borders of canvas
	function createBorder()
		{
		createRectangle(0, 0, canvas.width, 10, 2*Math.PI);  // AKA, "0" radians, "Oh, yeah, that has to be RADIANS"I
        createRectangle(0, 0, 10, canvas.height, 2*Math.PI);
        createRectangle(0, canvas.height-10, canvas.width, 10, 2*Math.PI);
        createRectangle(canvas.width-10, 0, 10, canvas.height, 2*Math.PI);
		}
		
		function createLevel(level)
    {
        if (level == 1) {
            createLevel1();
        } else if (level == 2) {
            createLevel2();
        } else if (level == 3) {
            createLevel3();
        } else if (level == 4) {
            createLevel4();
        } else createLevel5();
    }

    function createLevel1()
    {
        createRectangle(100, 100, 48, 48, 2*Math.PI);  // AKA, "0" radians, "Oh, yeah, that has to be RADIANS"I
        createRectangle(200, 200, 48, 48, 2*Math.PI);
        createRectangle(300, 300, 48, 48, 2*Math.PI);
        createTriangle(100,50,20,30,2*Math.PI);
        createCircle(400,100,40,40,2*Math.PI);
    }

    // creates a new rectangle of the specified scale and position
    function createRectangle(pos_x, pos_y, scale_x, scale_y, angle)
    {
        var p1 = new Point(0, 0);
        var p2 = new Point(1, 0);
        var p3 = new Point(1, 1);
        var p4 = new Point(0, 1);
        var rect = new Shape(canvas, [p1, p2, p3, p4]);
        rect.setScale(scale_x, scale_y);
        rect.setPos(pos_x, pos_y);
        rect.setCenter(0,0);
        rect.setAngle(angle);

        rect.velocity = 0;
        rect.acceleration =  0;
        allShapes.push(rect); // handing off the new object to the renderer
    }

    function createTriangle(pos_x, pos_y, scale_x, scale_y, angle)
    {
        var t1 = new Point(0,0);
        var t2 = new Point(0,1);
        var t3 = new Point(1,1);
        var tri = new Shape(canvas, [t1,t2,t3]);
        tri.setScale(scale_x, scale_y);
        tri.setPos(pos_x, pos_y);
        tri.setCenter(0,0);
        -tri.setAngle(angle);

        tri.velocity = 0;
        tri.acceleration =  0;
        allShapes.push(tri);
    }

    function createCircle(pos_x, pos_y, scale_x, scale_y, angle)
    {
        var pts = [];
        for (i = 0; i < 2 * Math.PI; i += Math.PI / 15)
            pts.push(new Point(Math.cos(i), Math.sin(i)));

        var circle = new Shape(canvas, pts);
        circle.setScale(scale_x, scale_y);
        circle.setPos(pos_x, pos_y);

        circle.setCenter(0,0);
        circle.setAngle(angle);

        circle.velocity = 5;
        circle.acceleratoin = 0;
        allShapes.push(circle);

    }
	 //smart way to do animations that is optimized
	window.requestAnimFrame = (function(callback) {
		return  window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
				function(callback) { window.setTimeout(callback, 1000 / 60); };
  })();	

        // Start mouse move and render functions
        //canvas.addEventListener('mousemove', mousemove);
        //canvas.addEventListener('mousedown', mousedown);
        //canvas.addEventListener('mouseup', mouseup);
		
		//call render with start time
        render((new Date).getTime());
     
function update_cannon_angle(){
  //allShapes[4] is the cannon barrel
  allShapes[4].setAngle(cannon_theta*Math.PI / 180);
}

function update_cannon_height(){
  //barrel
  allShapes[4].setPos(allShapes[4].xPos, cannon_height + 15);
  //wheel
  allShapes[5].setPos(allShapes[5].xPos, cannon_height-7);
  //ball
  allShapes[6].setPos(allShapes[6].xPos, cannon_height+27);
}

function reload(){
  update_cannon_height();
  update_cannon_angle();
}

// Start mouse move and render functions
canvas.addEventListener('mousemove', mousemove);
canvas.addEventListener('mousedown', mousedown);
canvas.addEventListener('mouseup', mouseup);

//call redner with start time
render((new Date).getTime());
