var canvas = document.getElementById("v_canvas");
var c = canvas.getContext("2d");
var width = canvas.width;
var height = canvas.height;
var x = 25;
var y = 75;
var obnum = 75;
var mainclicked = false;

renderFirst();

function main(){

	bRenderVars = false;

	var visLoop = setInterval(function(){
	var Yarray = [75, 125, 175, 225, 275, 325, 375, 425];
	var initialX = 425;
	var initialY = 75;

	if(mainclicked == true){

	if(obnum == 475){
		clearInterval(visLoop);
		c.fillStyle = "white";
		c.fillText("Engine.create(WorldObjectArray);", 75, 500, 400);
		return;

	}
	else if(x == 425){
		x = 25;
		y = 75;
		obnum += 50;
	}

	c.clearRect(0,0, width, height);
    console.log("SETTING PATH");

	c.fillStyle = "black";
	c.fillRect(0, 0, canvas.width, canvas.height);

	c.font = "20px Georgia";
	c.fillStyle = "white";
	c.fillText("World Object Array" ,300, 50, 300);


	calculateText(obnum);

	if(obnum != 475){
	c.fillStyle = "blue";
   	c.fillRect(x, y, 40, 40);


 	c.beginPath();
	c.moveTo(25, 75);
	c.lineTo(25, y+ 20);
	c.strokeStyle = '#ff0000';
	c.stroke(); 

	c.beginPath();
	c.moveTo(25, y + 20);
	c.lineTo(x, y + 20);
	c.strokeStyle = '#ff0000';
	c.stroke();
    }
   	calculateMovement(obnum);

   	var fill = 75;

	for(var i = 0; i <= 7; i++){
		
		if(fill <= obnum){
			c.fillStyle = "blue";
   			c.fillRect(initialX, initialY, 40, 40);
   			fill += 50
   		}

   		else{
			c.fillStyle = "yellow";
   			c.fillRect(initialX, initialY, 40, 40);
   		}
   		c.fillStyle = "white";
		c.fillText(i.toString(), initialX+40, initialY+30, 20);
		initialY += 50;
	}

}

},25);

}
function calculateMovement(ob){

			if(y == ob){
				x+=5;
			}
			 
			else{
				y+=5;
			}

}

function calculateText(ob){

	if(ob == 75){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("Background image" ,0, 50, 300);
	}

	else if(ob == 125){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("target" ,0, 50, 300);
	}

	else if(ob == 175){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("Obstacle 1" ,0, 50, 300);
	}

	else if(ob == 225){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("Obastacle 2" ,0, 50, 300);
	}

	else if(ob == 275){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("Obstacle 3" ,0, 50, 300);
	}

	else if(ob == 325){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("Obstacle 4" ,0, 50, 300);
	}

	else if(ob == 375){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("Obstacle 5" ,0, 50, 300);
	}

	else if(ob == 425){
		c.font = "20px Georgia";
	    c.fillStyle = "white";
	    c.fillText("ball" ,0, 50, 300);
	}

}

function renderFirst(){

	var iX = 425;
	var iY = 75;

	c.fillStyle = "black";
	c.fillRect(0, 0, canvas.width, canvas.height);

	c.font = "20px Georgia";
	c.fillStyle = "white";
	c.fillText("World Object Array" ,300, 50, 300);

	c.font = "20px Georgia";
	c.fillStyle = "white";
	c.fillText("Object to be Added" ,0, 50, 300);

	c.fillStyle = "blue";
	c.fillRect(25, 75, 40, 40);

	for(var i = 0; i <= 7; i++){
		
		c.fillStyle = "yellow";
   		c.fillRect(iX, iY, 40, 40);
		c.fillStyle = "white";
		c.fillText(i.toString(), iX+40, iY+25, 20);
		iY += 50;
	}
}
