// Set this variable to true to render the variable visualization
var bRenderVars = false;

// Initialize the visualation
var vvars = new visualization();
vvars.setCanvas(document.getElementById('v_canvas'));
vvars.fontSizeMax = 24;

function render_variables()
{
	if (bRenderVars == false)
		return;
	vvars.setVariable('ball.position.x', ball.position.x);
	vvars.setVariable('ball.position.y', ball.position.y);
	vvars.setVariable('ball.velocity.x', ball.velocity.x);
	vvars.setVariable('ball.velocity.y', ball.velocity.y);
	
	vvars.setRoundingRule('ball.position.x', 1);
	vvars.setRoundingRule('ball.position.y', 1);
	vvars.setRoundingRule('ball.velocity.x', 0);
	vvars.setRoundingRule('ball.velocity.y', 0);
	vvars.render(0, 0, 500, 560);
}

function enable_variables()
{
	bRenderVars = true;
	vVars.needPositionUpdate = true;
}