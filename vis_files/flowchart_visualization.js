
function flowchart_visualization()
{
	this.texth = 24;
	this.ports = ['left', 'up', 'down', 'right'];
	this.reset();
	this.portlen = 25;
}

flowchart_visualization.prototype.setCanvas = function (canvas)
{
    this.outputCanvas = canvas;
    this.outputContext = canvas.getContext('2d');
};

flowchart_visualization.prototype.reset = function()
{
	this.nodes = {};
	this.x = 0;
	this.y = 0;
};

flowchart_visualization.prototype.center_on = function(id)
{
	if (typeof this.nodes[id] != 'undefined')
	{
		this.x = this.nodes[id].x;
		this.y = this.nodes[id].y;
	}
}

flowchart_visualization.prototype.get_by_id = function(id)
{
	return this.nodes[id];
}

flowchart_visualization.prototype.terminal = function(id, text, x, y)
{
	this.nodes[id] = {type:'terminal', text:text, x:x, y:y, left:{}, up:{}, down:{}, right:{}};
	return this.nodes[id];
};

flowchart_visualization.prototype.decision = function(id, text, x, y)
{
	this.nodes[id] = {type:'decision', text:text, x:x, y:y, left:{}, up:{}, down:{}, right:{}};
	return this.nodes[id];
};

flowchart_visualization.prototype.io = function(id, text, x, y)
{
	this.nodes[id] = {type:'io', text:text, x:x, y:y, left:{}, up:{}, down:{}, right:{}};
	return this.nodes[id];
};

flowchart_visualization.prototype.process = function(id, text, x, y)
{
	this.nodes[id] = {type:'process', text:text, x:x, y:y, left:{}, up:{}, down:{}, right:{}};
	return this.nodes[id];
};

flowchart_visualization.prototype.arrow = function(sourceID, sourcePort, destID, destPort, label)
{
	if (typeof this.nodes[sourceID] == 'undefined' || typeof this.nodes[destID] == 'undefined')
	{
		console.warn('flowchart_visualization.arrow: ' + sourceID + ' or ' + destID + ' does not exist');
		return;
	}
	if (this.ports.indexOf(sourcePort) == -1 || this.ports.indexOf(destPort) == -1)
	{
		console.warn('flowchart_visualization.arrow: ' + sourcePort + ' or ' + destPort + ' is not a valid port');
		return;
	}
	this.nodes[sourceID][sourcePort] = {type:'arrow', dest:destID, port:destPort, label:label};
};

flowchart_visualization.prototype.render = function()
{
	var ctx = this.outputContext;
	ctx.font = this.texth + 'px monospace';
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.lineWidth = 2;
	
	// Black fill
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
	
	ctx.translate(this.outputCanvas.width / 2 - this.x, this.outputCanvas.height / 2 - this.y);
	for (id in this.nodes)
	{
		var node = this.nodes[id];
		if (node.type == 'terminal')
			this._oval(ctx, node);
		else if (node.type == 'decision')
			this._diamond(ctx, node);
		else if (node.type == 'io')
			this._parallelogram(ctx, node);
		else if (node.type == 'process')
			this._rectangle(ctx, node);
		else
			console.warn('flowchart_visualization.render: Unrecognized node type');
	}
	
	ctx.strokeStyle = 'white';
	for (id in this.nodes)
	{
		var node = this.nodes[id];
		for (i in this.ports)
		{
			var port = this.ports[i];
			if (node[port].type == 'arrow')
			{
				var source = node[port];
				var dest = this.nodes[source.dest][source.port];
				ctx.beginPath();
				ctx.moveTo(source.p0.x, source.p0.y);
				ctx.lineTo(source.p1.x, source.p1.y);
				ctx.lineTo(dest.p1.x, dest.p1.y);
				ctx.lineTo(dest.p0.x, dest.p0.y);
				ctx.stroke();
			}
		}
			
	}
	ctx.setTransform(1, 0, 0, 1, 0, 0);
};


flowchart_visualization.prototype._oval = function(ctx, node)
{
	var x = node.x, y = node.y;
	var textw = ctx.measureText(node.text).width / 2;
	var radius = 25;
	ctx.beginPath();
	ctx.moveTo(x - textw, y - radius);
	ctx.arcTo(x - textw - 500, y, x - textw, y + radius, radius);
	ctx.lineTo(x + textw, y + radius);
	ctx.arcTo(x + textw + 500, y, x + textw, y - radius, radius);
	ctx.closePath();
	ctx.fillStyle = 'green';
	ctx.fill();
	ctx.strokeStyle = 'white';
	ctx.stroke();
	ctx.fillStyle = 'white';
	ctx.fillText(node.text, x - textw, y - this.texth / 2 - 2);
	node.left.p0 = {x:x - textw - radius, y:y};
	node.right.p0 = {x:x + textw + radius, y:y};
	node.up.p0 = {x:x, y:y - radius};
	node.down.p0 = {x:x, y:y + radius};
	node.left.p1 = {x:node.left.p0.x - this.portlen, y:y};
	node.right.p1 = {x:node.right.p0.x + this.portlen, y:y};
	node.up.p1 = {x:x, y:node.up.p0.y - this.portlen};
	node.down.p1 = {x:x, y:node.down.p0.y + this.portlen};
};

flowchart_visualization.prototype._parallelogram = function(ctx, node)
{
	var x = node.x, y = node.y;
	var textw = ctx.measureText(node.text).width / 2;
	var radius = 25;
  ctx.beginPath();
  ctx.moveTo(x - textw, y - radius);
	ctx.lineTo(x - textw - radius, y + radius);
	ctx.lineTo(x + textw, y + radius);
	ctx.lineTo(x + textw + radius, y - radius);
	ctx.closePath();
	ctx.fillStyle = 'green';
	ctx.fill();
	ctx.strokeStyle = 'white';
	ctx.stroke();
	ctx.fillStyle = 'white';
	ctx.fillText(node.text, x - textw, y - this.texth / 2 - 2);
	node.left.p0 = {x:x - textw - radius / 2, y:y};
	node.right.p0 = {x:x + textw + radius / 2, y:y};
	node.up.p0 = {x:x, y:y - radius};
	node.down.p0 = {x:x, y:y + radius};
	node.left.p1 = {x:node.left.p0.x - this.portlen, y:y};
	node.right.p1 = {x:node.right.p0.x + this.portlen, y:y};
	node.up.p1 = {x:x, y:node.up.p0.y - this.portlen};
	node.down.p1 = {x:x, y:node.down.p0.y + this.portlen};
};

flowchart_visualization.prototype._diamond = function(ctx, node)
{
	var x = node.x, y = node.y;
	var textw = ctx.measureText(node.text).width / 2;
	var radius = textw / 2;
	var h = this.texth * (textw + radius) / (2 * radius);
  ctx.beginPath();
  ctx.moveTo(x - textw - radius, y);
	ctx.lineTo(x, y + h);
	ctx.lineTo(x + textw + radius, y);
	ctx.lineTo(x, y - h);
	ctx.closePath();
	ctx.fillStyle = 'green';
	ctx.fill();
	ctx.strokeStyle = 'white';
	ctx.stroke();
	ctx.fillStyle = 'white';
	ctx.fillText(node.text, x - textw, y - this.texth / 2 - 2);
	node.left.p0 = {x:x - textw - radius, y:y};
	node.right.p0 = {x:x + textw + radius, y:y};
	node.up.p0 = {x:x, y:y - h};
	node.down.p0 = {x:x, y:y + h};
	node.left.p1 = {x:node.left.p0.x - this.portlen, y:y};
	node.right.p1 = {x:node.right.p0.x + this.portlen, y:y};
	node.up.p1 = {x:x, y:node.up.p0.y - this.portlen};
	node.down.p1 = {x:x, y:node.down.p0.y + this.portlen};
};

flowchart_visualization.prototype._rectangle = function(ctx, node)
{
	var x = node.x, y = node.y;
	var textw = ctx.measureText(node.text).width / 2;
	var radius = 25;
  ctx.beginPath();
  ctx.moveTo(x - textw - radius, y - radius);
	ctx.lineTo(x - textw - radius, y + radius);
	ctx.lineTo(x + textw + radius, y + radius);
	ctx.lineTo(x + textw + radius, y - radius);
	ctx.closePath();
	ctx.fillStyle = 'green';
	ctx.fill();
	ctx.strokeStyle = 'white';
	ctx.stroke();
	ctx.fillStyle = 'white';
	ctx.fillText(node.text, x - textw, y - this.texth / 2 - 2);
	node.left.p0 = {x:x - textw - radius, y:y};
	node.right.p0 = {x:x + textw + radius, y:y};
	node.up.p0 = {x:x, y:y - radius};
	node.down.p0 = {x:x, y:y + radius};
	node.left.p1 = {x:node.left.p0.x - this.portlen, y:y};
	node.right.p1 = {x:node.right.p0.x + this.portlen, y:y};
	node.up.p1 = {x:x, y:node.up.p0.y - this.portlen};
	node.down.p1 = {x:x, y:node.down.p0.y + this.portlen};
};
