var canvas = document.getElementById("physicsCanvas");
var ctx = canvas.getContext("2d");
var xMedian = canvas.width/2;
var yMedian = canvas.height/2;

var Engine = Matter.Engine, //manages updating and rendering canvas
    World = Matter.World, //composite of entire canvas
    Bodies = Matter.Bodies, //used to create shapes within canvas
    Body = Matter.Body, //used to manipulated created bodies in canvas
    Events = Matter.Events, //used for mouse events like mousdown, mousemove, and mouseup
	Composite = Matter.Composite, //to clear constraints from the ball before fired and modify composites (remove doesn't work?!)
	Composites = Matter.Composites, //used to build composites (combining lots of shapes into structures like walls etc)
	Constraint = Matter.Constraint, //used to create launcher for the ball 
	MouseConstraint = Matter.MouseConstraint, //mouse events must go through mouseconstraint instead of engine now
	Runner = Matter.Runner, //for fps
	Vector = Matter.Vector; //for vector algebra

var type1 = 0;
var amount1 = 0;
var isclicked = false;
gp_force = 0;
ball_density = 0;
var ball_is_clicked = false;
var gp_is_clicked = false;
var objects = [];
//keeps track of if the game is already running
var is_running = true;
var mouseIsclicked = false;
var targetHit = false;
var ballRestitution = 0;
var ballColor = ' ';
var currentLevel = 2;
var nebula = new Image();
nebula.src = 'images/nebula.jpg'
var nebula2 = new Image();
nebula2.src = 'images/nebula2.jpg'
var nebula3 = new Image();
nebula3.src = 'images/nebula3.jpg'

window.onload = function(){
  
if(currentLevel == 1){

  ctx.drawImage(nebula, 0, 0);
  ctx.font = "20px Georgia";
  ctx.fillStyle = "white";
  ctx.fillText("LEVEL 1" ,canvas.width*.8, canvas.height*.56, canvas.width*.2);
  ctx.fillStyle = 'brown';
  ctx.fillRect(200, 300, 60, 20);
  ctx.fillRect(150, 100, 20, 70);
  ctx.fillRect(300, 400, 30, 90);
  ctx.fillRect(600, 300, 60, 80);
  ctx.fillRect(600, 300, 60, 80);
  ctx.fillStyle = 'white';
  ctx.fillText('Target', 600, 260)
  ctx.fillText('Launcher', 60, 540)
// Create the world borders
}

else if(currentLevel == 2){

  ctx.drawImage(nebula2, 0, 0);
  ctx.font = "20px Georgia";
  ctx.fillStyle = "white";
  ctx.fillText("LEVEL 2" ,canvas.width*.8, canvas.height*.56, canvas.width*.2);
  ctx.fillStyle = 'brown';
  ctx.fillRect(100, 200, 60, 20);
  ctx.fillRect(400, 300, 60, 20);
  ctx.fillRect(270, 100, 20, 70);
  ctx.fillRect(300, 400, 30, 90);
  ctx.fillRect(600, 100, 60, 40);
  ctx.fillStyle = 'white';
  ctx.fillText('Target', 600, 80)
  ctx.fillText('Launcher', 60, 540)

}

else if(currentLevel == 3){

  ctx.drawImage(nebula3, 0, 0);
  ctx.font = "20px Georgia";
  ctx.fillStyle = "white";
  ctx.fillText("LEVEL 3" ,canvas.width*.8, canvas.height*.56, canvas.width*.2);
  ctx.fillStyle = 'brown';
  ctx.fillRect(600, 0, 40, 305);
  ctx.fillRect(640, 295, 40, 10);
  ctx.fillStyle = 'white';
  ctx.fillText('Target', 640, 275)
  ctx.fillText('Launcher', 60, 540)

}
}

// Set up renderer and engine options (see link for more options)
//TODO: We are getting a warning saying element is undefined. It is set to null by default. What element should we tie it to? The API says it's optional but still
// https://github.com/liabru/matter-js/wiki/Rendering
var engine = Engine.create({enableSleeping: true,
	render:	{
		canvas: canvas,         // render on this canvas (the one defined above)
		options: {
			wireframes: false,    // Do not render wireframes
			showVelocity: false,   // Show velocity vectors
			showCollisions: false,  // Show collision vectors
			showSleeping: false
		}
}});

//all of this global for now 

var fps; //used for the fps
var mouseConstraint = MouseConstraint.create(engine); //to get mouse events to work must explicitly create mouse constraint now
var worldObjects = [];
//this composite groups both the circleCannon and cannonball into one "body"
launcherSet = 0x0002; //used to make ball and cannonCircle not collide by putting them in same group
var launcher = Composite.create();

//this is the "cannon". Have the ball traverse the outer edge of the circle cause it looks cool
var circleCannon = Bodies.circle(60, 540, 30, { label2:"cannon", isStatic: true, collisionFilter:{category: launcherSet}, render:{fillStyle: 'gray'}});
Composite.addBody(launcher, circleCannon); //add circleCannon to composite for constraint made later

//console.log(circleCannon);

// Create the ball
var ball = Bodies.circle(60+30+10, 540, 10, { isStatic: true, label2:"ball", density: 0.01, collisionFilter:{category: launcherSet}, restitution:0.2});
Composite.addBody(launcher, ball); //add ball to composite for constraint made next

//create constraint on ball to stay around perimeter of circle launcher

var ballConstraint =
Constraint.create({
            bodyA: circleCannon,
            bodyB: ball
        });

Composite.addConstraint(launcher, ballConstraint); //we make sure the distance of centers between the ball and cannonCircle is constant
worldObjects.push(launcher);
//worldObjects.push(bgImage);

function run_simulation(){

// This is a hack to prevent physics from stopping at the edges of the canvas
// source: https://github.com/liabru/matter-js/issues/67
engine.world.bounds.min.x = -Infinity;
engine.world.bounds.min.y = -Infinity;
engine.world.bounds.max.x = Infinity;
engine.world.bounds.max.y = Infinity;


// Set up callbacks for event handling
//mouse events must come through a mouseConstraint
Events.on(mouseConstraint, 'mousedown', mousedown);
Events.on(mouseConstraint, 'mousemove', mousemove);
Events.on(engine, 'beforeRender', beforeRender);
Events.on(engine, 'afterRender', afterRender);
//I don't know if this works. Not sure if the object should be engine. Look in events.js example for the newest code (find online)
Events.on(engine, 'collisionEnd', afterCollision);
Events.on(engine, 'afterUpdate', afterUpdate);



create_world(worldObjects);

// add all of the bodies to the world
World.add(engine.world, worldObjects);

// run the engine
fps = Engine.run(engine);
}


var ball_fired = false;
// Pull the ball towards the mouse when the user clicks
function mousedown(event)
{
	Events.off(mouseConstraint); //turn off user's ability to interact (no more firing or changing position of ball)
  // Calculate a vector pointing from the ball to the mouse
  var vect = Vector.sub(event.mouse.mousedownPosition, ball.position);
  var vecLength = Vector.magnitude(vect);
  vect = Vector.mult(vect, 0.25);
  var force = Vector.div(vect, vecLength);
  force = Vector.mult(force, gp_force); //this is wonky
  // Apply that vector as a force
  //remove ballConstraint of launcher so the cannonball will move
  Body.setStatic(ball, false);
  console.log(ball.density);
  console.log(ball.restitution);
  Composite.removeConstraint(launcher, ballConstraint); 
  Body.applyForce(ball, ball.position, force);
  ball_fired = true;
  times = 5;
}

// Make ball follow mouse defined in mouseConstraint
var mousePos = {x:0, y:0};
function mousemove(event)
{

  var radiusComp = Vector.sub(ball.position, circleCannon.position); //the motion of the center of the ball makes another "circle" around circleCannon
  var radius = Vector.magnitude(radiusComp);
  var angle = Vector.angle(circleCannon.position, event.mouse.position); //angle between PI and -PI relative to 0 x-axis
  var newPos = Vector.create(radius*Math.cos(angle), radius*Math.sin(angle));
  newPos = Vector.add(newPos, circleCannon.position);
  //add ball the global worldObjects so it is affected by gravity
  Body.setPosition(ball, newPos);
  mousePos = event.mouse.position;
}


function calcFuture(body, force) {
	// Copy body variables so we don't overwrite them
	var x = body.position.x; var y = body.position.y;
	var px = body.positionPrev.x; var py = body.positionPrev.y;
	var vx = x - px; var vy = y - py;

	// Precalculate stuff that won't change
	var bodyMass = body.area * body.density;
	var frictionAir = 1 - body.frictionAir * engine.timing.timeScale * body.timeScale;
    var deltaTimeSquared = Math.pow(fps.delta * engine.timing.timeScale * body.timeScale, 2);
	var gravityX = bodyMass * engine.world.gravity.x * 0.001;
	var gravityY = bodyMass * engine.world.gravity.y * 0.001;

	// Calculate and store 180 physics timesteps into the future
	var futurePositions = [];
	for(i = 1; i < 180; i++)
	{
        // update velocity with Verlet integration
        vx = (vx * frictionAir) + (force.x / bodyMass) * deltaTimeSquared;
        vy = (vy * frictionAir) + (force.y / bodyMass) * deltaTimeSquared;

        px = x;
        py = y;
        x += vx;
        y += vy;
		
		futurePositions.push({x:x, y:y});
		force = {x:gravityX, y:gravityY};
    }
	return futurePositions;
}

function afterUpdate(event)
{
	render_variables();
}

function beforeRender(event){
  if(currentLevel == 1){
    engine.render.context.drawImage(nebula1, 0, 0);
    render_variables();

  }

  else if(currentLevel == 2){
    engine.render.context.drawImage(nebula2, 0, 0);
    render_variables();

  }

  else if(currentLevel == 3){
    engine.render.context.drawImage(nebula3, 0, 0);
    render_variables();

  }


}
// Draw FPS on the canvas
function afterRender(event)
{
	var ctx = engine.render.context;
	ctx.font = '20px Consolas';
	

  if(targetHit){
	ctx.strokeStyle = 'yellow'
	ctx.fillStyle = '#009900';
	var width = 300; var height = 100;
	ctx.fillRect((canvas.width - width ) / 2, (canvas.height - height) / 2, 300, 100);
	ctx.strokeRect((canvas.width - width ) / 2, (canvas.height - height) / 2, 300, 100);
    ctx.font = '20px Consolas';
    ctx.fillStyle = '#efefef';
    ctx.fillText("Level Complete!",430,300);
  }
  
  if (!ball_fired)
  {
	var vect = Vector.sub(mousePos, ball.position);
	var vecLength = Vector.magnitude(vect);
	vect = Vector.mult(vect, 0.25);
	var force = Vector.div(vect, vecLength);
	force = Vector.mult(force, gp_force); 
	var futurePositions = calcFuture(ball, force);
	ctx.strokeStyle = 'yellow';
	ctx.beginPath(); ctx.moveTo(ball.position.x, ball.position.y);
	
	for(i in futurePositions)
		ctx.lineTo(futurePositions[i].x, futurePositions[i].y);
	ctx.stroke();
  } 

  ctx.fillStyle = 'yellow';
	ctx.fillText(Math.round(fps.fps), 40, 40); //New way to display fps
}

function afterCollision(event)
{
	//console.log("after collision");
	for(k in event.pairs)
	{
		var a = event.pairs[k].bodyA;
		var b = event.pairs[k].bodyB;
		if (a.label2 == "ball" && b.label2 == "target")
			targetHit = true;
		if (b.label2 == "ball" && a.label2 == "target")
			targetHit = true;
	}
}


function create_world(worldObjects){

	createLevel(worldObjects, currentLevel); //currentLevel is a global variable
	
}

 function createLevel(worldObjects, level)
    {
        if (level == 1) {
            createLevel1(worldObjects);
        } else if (level == 2) {
            createLevel2(worldObjects);
        } else if (level == 3) {
            createLevel3(worldObjects);
        } else if (level == 4) {
            createLevel4(worldObjects);
        } else createLevel5(worldObjects);
    }

	
var target;
function createLevel1(worldObjects)
{

worldObjects.push(Bodies.rectangle(xMedian, yMedian, 1, 1, { isStatic: true, render:{sprite:{texture: 'images/nebula.jpg'}}}));
// Create a custom shape
worldObjects.push(target = Body.create({
    position: { x: 600, y: 260 }
  , restitution: 0.5
  , vertices: [{ x:0, y: 0 }, { x:-20, y: 10 }, { x:-20, y: 30 }, { x:20, y: 30 }, { x:20, y: 10 }]
  , label2:"target"
}));

// Create some simple obstacles
worldObjects.push(Bodies.rectangle(200, 300, 60, 20, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(150, 100, 20, 70, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(300, 400, 30, 90, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(600, 300, 60, 80, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(600, 300, 60, 80, { isStatic: true, render:{fillStyle: 'brown'}}));
// Create the world borders
var borderThickness = 100;  // Actual thickness of border (thicker means less chance of clipping through at high speeds)
var borderVisible = 20;     // Thickness of border onscreen
var borderOffset = (borderThickness - borderVisible) / 2;
worldObjects.push(Bodies.rectangle(canvas.width / 2, canvas.height + borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'green'} })); // bottom
worldObjects.push(Bodies.rectangle(canvas.width / 2, -borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'blue'}}));   // top
worldObjects.push(Bodies.rectangle(-borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // left
worldObjects.push(Bodies.rectangle(canvas.width + borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // right

}

function createLevel2(worldObjects)
{
worldObjects.push(Bodies.rectangle(xMedian, yMedian, 1, 1, { isStatic: true, render:{sprite:{texture: 'images/nebula2.jpg'}}}));
// Create a custom shape
worldObjects.push(target = Body.create({
    position: { x: 600, y: 80 }
  , restitution: 0.5
  , vertices: [{ x:0, y: 0 }, { x:-20, y: 10 }, { x:-20, y: 30 }, { x:20, y: 30 }, { x:20, y: 10 }]
  , label2:"target"
}));

// Create some simple obstacles
worldObjects.push(Bodies.rectangle(100, 200, 60, 20, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(400, 300, 60, 20, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(270, 100, 20, 70, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(300, 400, 30, 90, { isStatic: true, render:{fillStyle: 'brown'}}));

worldObjects.push(Bodies.rectangle(600, 100, 60, 40, { isStatic: true, render:{fillStyle: 'brown'}}));

// Create the world borders
var borderThickness = 100;  // Actual thickness of border (thicker means less chance of clipping through at high speeds)
var borderVisible = 20;     // Thickness of border onscreen
var borderOffset = (borderThickness - borderVisible) / 2;
worldObjects.push(Bodies.rectangle(canvas.width / 2, canvas.height + borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'green'} })); // bottom
worldObjects.push(Bodies.rectangle(canvas.width / 2, -borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'blue'}}));   // top
worldObjects.push(Bodies.rectangle(-borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // left
worldObjects.push(Bodies.rectangle(canvas.width + borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // right

}

function createLevel3(worldObjects)
{
worldObjects.push(Bodies.rectangle(xMedian, yMedian, 1, 1, { isStatic: true, render:{sprite:{texture: 'images/nebula3.jpg'}}}));
// Create a custom shape
worldObjects.push(target = Body.create({
    position: { x: 640, y: 275 }
  , restitution: 0.5
  , vertices: [{ x:0, y: 0 }, { x:-20, y: 10 }, { x:-20, y: 30 }, { x:20, y: 30 }, { x:20, y: 10 }]
  , label2:"target"
}));

// Create some simple obstacles
worldObjects.push(Bodies.rectangle(600, 100, 40, 400, { isStatic: true, render:{fillStyle: 'brown'}}));
worldObjects.push(Bodies.rectangle(640, 295, 40, 10, { isStatic: true, render:{fillStyle: 'brown'}}));

//build a destructible wall
//x pos, y pos, # rows, # cols, x spacing, y spacing
var stack = Composites.stack(450, 200, 3, 3, 5, 0, function(x, y) {
	return Bodies.rectangle(x, y, 30, 30, { density: 0.02});
});

// Create the world borders
var borderThickness = 100;  // Actual thickness of border (thicker means less chance of clipping through at high speeds)
var borderVisible = 20;     // Thickness of border onscreen
var borderOffset = (borderThickness - borderVisible) / 2;
worldObjects.push(Bodies.rectangle(canvas.width / 2, canvas.height + borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'green'} })); // bottom
worldObjects.push(Bodies.rectangle(canvas.width / 2, -borderOffset, canvas.width, borderThickness, { isStatic: true, render:{fillStyle: 'blue'}}));   // top
worldObjects.push(Bodies.rectangle(-borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // left
worldObjects.push(Bodies.rectangle(canvas.width + borderOffset, canvas.height / 2, borderThickness, canvas.height, { isStatic: true, render:{fillStyle: 'blue'}}));  // right

}


//***********************************************
//Setters: functions to set the amount1 and type1 variable
//according to what the user clicked on in the webpage
//***********************************************

function set_iron(){

  if(ball_is_clicked == false){

    //draw_first_row(type1);
    type1 = "1";
	  Body.setDensity(ball, 0.09);
    ballRestitution = 0.4;
    Body.setRestitution(ball, ballRestitution);
    ballColor = 'grey';
    Body.setFillstyle(ball, ballColor);
    ball_is_clicked = true;

  }

}

function set_steel(){
  
  if(ball_is_clicked == false){

    type1 = "2";
	  Body.setDensity(ball, 0.07);
    ballRestitution = 0.3;
    Body.setRestitution(ball, ballRestitution);
    ballColor = 'silver';
    Body.setFillstyle(ball, ballColor);
    ball_is_clicked = true;

  }

}

function set_rubber(){
  
  if(ball_is_clicked == false){

    //draw_first_row(type1);
    type1 = "3";
	  Body.setDensity(ball, 0.05);
    ballRestitution = 0.8;
    Body.setRestitution(ball, ballRestitution);
    ballColor = 'red';
    Body.setFillstyle(ball, ballColor);
    ball_is_clicked == true;

  }

}

function set_gp1(){
  
  if(gp_is_clicked == false){
    amount1 = "1";

    if(type1 == "0"){
        alert("You must choose a cannonball type first");
    }

    else{
    	gp_force = 5;
      gp_is_clicked = true;
      mainclicked = true;
	    main();
    	run_simulation();
	  }
  }

}

function set_gp2(){

  if(gp_is_clicked == false){
    amount1 = "2";
    if(type1 == "0"){
        alert("You must choose a cannonball type first");
    }

    else{
    	gp_force = 7;
      gp_is_clicked = true;
      mainclicked = true;
      main();
    	run_simulation();
	  }
  }

}

function set_gp3(){

  if(gp_is_clicked == false){
    amount1 = "3";
    if(type1 == "0"){
        alert("You must choose a cannonball type first");
    }

    else{
      gp_force = 8.65;
      gp_is_clicked = true;
      mainclicked = true;
      main();
      run_simulation();
    } 
  }

}
