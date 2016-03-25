/***********************************************************************
 *                      utility.js
 * Functions here have no other requirements and may be used across
 * multiple files.
 ***********************************************************************/

// Credit pixi.js (MIT)
function pixiGetFontHeight(fontStyle)
{
	if ( typeof pixiGetFontHeight.fontHeightCache == 'undefined' )
		pixiGetFontHeight.fontHeightCache = {};
		
	var result = pixiGetFontHeight.fontHeightCache[fontStyle];

	if (!result) {
		var body = document.getElementsByTagName('body')[0];
		var dummy = document.createElement('div');

		var dummyText = document.createTextNode('M');
		dummy.appendChild(dummyText);
		dummy.setAttribute('style', 'font:' + fontStyle + ';position:absolute;top:0;left:0');
		body.appendChild(dummy);
		result = dummy.offsetHeight;

		pixiGetFontHeight.fontHeightCache[fontStyle] = result;
		body.removeChild(dummy);
		//debug("pixiGetFontHeight: Cached " + fontStyle + " = " + result);
	}

	return result;
}

//http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x+r, y);
  this.arcTo(x+w, y,   x+w, y+h, r);
  this.arcTo(x+w, y+h, x,   y+h, r);
  this.arcTo(x,   y+h, x,   y,   r);
  this.arcTo(x,   y,   x+w, y,   r);
  this.closePath();
  return this;
};

function round(num, decimals)
{
	return +num.toFixed(decimals);
}