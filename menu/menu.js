	
ctx.font = '24px monospace';

var levelLength = getTextLength('Level Select', ctx);
var levelHeight = getHeight('Level Select');

function centerText(ctx, text, y){
	var measurement = ctx.measureText(text);
	var x = (ctx.canvas.width - measurement.width) / 2;
	ctx.fillText(text, x, y);
}

function centerTextBackground(ctx, text, y){
	var measurement = ctx.measureText(text);
	var x = (ctx.canvas.width - measurement.width) / 2;
	ctx.fillStyle = 'black';
	ctx.fillRect(x, y, measurement.width, getHeight(text) + ctx.canvas.height * .02 )
}
    
function getTextLength(txt, ctx){
    	var measurement = ctx.measureText(txt);
		return measurement.width;
    }

function getHeight(fontStyle)
    {
	if ( typeof getHeight.fontHeightCache == 'undefined' )
		getHeight.fontHeightCache = {};
		
	var result = getHeight.fontHeightCache[fontStyle];

	if (!result) {
		var body = document.getElementsByTagName('body')[0];
		var dummy = document.createElement('div');

		var dummyText = document.createTextNode('M');
		dummy.appendChild(dummyText);
		dummy.setAttribute('style', 'font:' + fontStyle + ';position:absolute;top:0;left:0');
		body.appendChild(dummy);
		result = dummy.offsetHeight;

		getHeight.fontHeightCache[fontStyle] = result;
		body.removeChild(dummy);

	}

	return result;
}

function detectColor(t, ctx, ypos, mousePosX, mousePosY) {
		var x = (ctx.canvas.width - getTextLength(t, ctx)) / 2;
		var textWidth = getTextLength(t, ctx);
		var textHeight = getHeight(t);

		if(mousePosX >= x && mousePosX <= x + textWidth && mousePosY >= ypos && mousePosY <= ypos + textHeight+ctx.canvas.height*.02)
			return 'red';
           
		else
		   return 'white';
	
	}

function mouseClick(ctx, is_Start, clickX, clickY){

	var x = (ctx.canvas.width - levelLength) / 2;
    var y = ctx.canvas.height / 2;
    var ht = ctx.canvas.height;
    
    console.log('width= ' + levelLength);
	if(clickX >= x && clickX <= x + levelLength){

		if(clickY <= (levelHeight + ctx.canvas.height*.02 + (y + ht*.08)) && clickY >= (y + ht*.08)){

		  if(is_Start == 'Start')
		  	return 'Start';
		  else
		  	return 'Restart';
	    }

	    else if(clickY <= (levelHeight + ctx.canvas.height*.02 + (y + ht*.16)) && clickY >= (y + ht*.16))
	       return 'Quit';

	    else if(clickY <= (levelHeight + ctx.canvas.height*.02 + (y + ht*.24)) && clickY >= (y + ht*.24))
	       return 'Level Select';
	     
	    else if(clickY <= (levelHeight + ctx.canvas.height*.02 + (y + ht*.32)) && clickY >= (y + ht*.32)){
	    	if(is_Start == 'Lost')
	    		return 'Restart';
	    	else
	    		return 'Cancel';
	    }
	}
}

function drawOptions(text, ctx, mousePosX, mousePosY){
	var y = ctx.canvas.height / 2;
    var ht = ctx.canvas.height;

	ctx.font = '24px monospace';
	centerTextBackground(ctx, 'Restart', y+ ht*.08)
	ctx.fillStyle = detectColor('Restart', ctx, y+ht*.08, mousePosX, mousePosY);
	centerText(ctx, 'Restart', y + ht*.08);

	ctx.font = '24px monospace';
	centerTextBackground(ctx, 'Quit', y+ ht*.16)
	ctx.fillStyle = detectColor('Quit', ctx, y+ht*.16, mousePosX, mousePosY);
	centerText(ctx, 'Quit', y + ht*.16, mousePosX, mousePosY);

	ctx.font = '24px monospace';
	centerTextBackground(ctx, 'Level Select', y+ ht*.24)
	ctx.fillStyle = detectColor('Level Select', ctx, y+ht*.24, mousePosX, mousePosY);
	centerText(ctx, 'Level Select', y + ht*.24);

	ctx.font = '24px monospace';
	centerTextBackground(ctx, 'Cancel', y+ ht*.32)
	ctx.fillStyle = detectColor('Cancel', ctx, y+ht*.32, mousePosX, mousePosY);
	centerText(ctx, 'Cancel', y + ht*.32);
}

function menu(ctx, startOrPause, mousePosX, mousePosY, clickX, clickY){

		var y = ctx.canvas.height / 2;
        var ht = ctx.canvas.height;

		if(startOrPause == "start"){

			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.fillStyle = 'blue';
        	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			ctx.fillStyle = 'white';
			ctx.font = '48px monospace';
			centerText(ctx, 'Physics Game', y);

			ctx.font = '24px monospace';
			centerTextBackground(ctx, 'Restart', y+ ht*.08)
			ctx.fillStyle = detectColor('Restart', ctx, y+ht*.08, mousePosX, mousePosY);
			centerText(ctx, 'Start', y + ht*.08);
		}
        else if (startOrPause == "pause") {

        	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        	ctx.fillStyle = 'blue';
        	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			ctx.fillStyle = 'white';
			ctx.font = '48px monospace';
			centerText(ctx, 'Game Paused', y);
  
            drawOptions('Restart', ctx, mousePosX, mousePosY);
            drawOptions('Quit', ctx, mousePosX, mousePosY);
            drawOptions('Level Select', ctx, mousePosX, mousePosY);
            drawOptions('Cancel', ctx, mousePosX, mousePosY);

        }

        else {

        	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        	ctx.fillStyle = 'blue';
        	ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);

			ctx.fillStyle = 'white';
			ctx.font = '48px monospace';
			centerText(ctx, "You Lost, LOL", y);

            drawOptions('Restart', ctx, mousePosX, mousePosY);
            drawOptions('Quit', ctx, mousePosX, mousePosY);
            drawOptions('Level Select', ctx, mousePosX, mousePosY);
            drawOptions('Cancel', ctx, mousePosX, mousePosY);

        }
       }
