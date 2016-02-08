type1 = 0;
amount1 = 0;
renderCF = false;   //not default visualization
//*************************************************
//draw_first_row: takes the type as a parameter and 
//draws the first row of the flow chart according 
//to what value is in the type1 variable
//*************************************************

function enable_cf_vis(){
    arrayVis_enableRender.rendering = false;
    bRenderVars = false;
    renderCF = true;
}

function draw_first_row(type1){

    var canvas = document.getElementById("v_canvas");
    var c = canvas.getContext("2d");

    c.fillStyle = "black";
    c.fillRect(0, 0, canvas.width, canvas.height);

    //FIRST RECTANGLE: WILL DISPLAY A FUNCTION NAME, AND PARAMETERS PASSED IN
    c.fillStyle = "green";
    c.strokeStyle = "green";
    c.strokeWidth = 5;
    c.fillRect(canvas.width/2 - canvas.width*.2, 0, canvas.width*.4, canvas.height*.08333333);
    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("draw(type, amount);" ,canvas.width/2-canvas.width*.2, canvas.height*.05, canvas.width*.4);

//FIRST ROW OF RECTANGLES: WILL DISPLAY THREE CONDITIONAL STAEMENTS
    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(0, canvas.height*.17, canvas.width*.2, canvas.height*.08);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(type = 1)" , 0, canvas.height*.22, canvas.width*.2);

    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(canvas.width/2 - canvas.width*.1, canvas.height*.17, canvas.width*.2, canvas.height*.08);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(type = 2)" ,canvas.width/2-canvas.width*.1, canvas.height*.22, canvas.width*.2);

    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(canvas.width*.8, canvas.height*.17, canvas.width*.2, canvas.height*.08);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(type = 3)" ,canvas.width*.8, canvas.height*.22, canvas.width*.2);

    if(type1 == "1"){
        c.beginPath();
        c.moveTo(canvas.width/2, canvas.height*.08333333);
        c.lineTo(canvas.width*.1, canvas.height*.17);
        c.stroke();  

    }

    if(type1 == "2"){
        c.beginPath();
        c.moveTo(canvas.width/2, canvas.height*.08333333);
        c.lineTo(canvas.width/2, canvas.height*.16666);
        c.stroke();  
    }

    if(type1 == "3"){
        c.beginPath();
        c.moveTo(canvas.width/2, canvas.height*.08333);
        c.lineTo(canvas.width*.9, canvas.height*.16666);
        c.stroke();  

    }
}
//*****************************************
//draw_rectangles: This is a function to 
//draw all rows of rectangles in which the flow chart
//will use to visualize contorl flow. There is also
//the code for drawing text inside of the rectangles.
//The rectangles are drawn in three rows and linked 
//inside of another function (draw_flow_chart)
//*****************************************
function draw_rows(ty, am, can, ctx)
{    
    var canvas = can;
    var c = ctx;

//FIRST RECTANGLE: WILL DISPLAY A FUNCTION NAME, AND PARAMETERS PASSED IN
    c.fillStyle = "green";
    c.strokeStyle = "green";
    c.strokeWidth = 5;
    c.fillRect(canvas.width/2 - canvas.width*.2, 0, canvas.width*.4, canvas.height*.08333333);
    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("draw(type, amount);" ,canvas.width/2-canvas.width*.2, canvas.height*.05, canvas.width*.4);

//FIRST ROW OF RECTANGLES: WILL DISPLAY THREE CONDITIONAL STAEMENTS
    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(0, canvas.height*.17, canvas.width*.2, canvas.height*.08);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(type = 1)" , 0, canvas.height*.22, canvas.width*.2);

    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(canvas.width/2 - canvas.width*.1, canvas.height*.17, canvas.width*.2, canvas.height*.08);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(type = 2)" ,canvas.width/2-canvas.width*.1, canvas.height*.22, canvas.width*.2);

    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(canvas.width*.8, canvas.height*.17, canvas.width*.2, canvas.height*.08);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(type = 3)" ,canvas.width*.8, canvas.height*.22, canvas.width*.2);

//SECOND ROW OF RECTANGLES: DISPLAYS THE NEXT SET OF NESTED CONDITIONALS
    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(0, canvas.height*.5, canvas.width*.2, canvas.height*.08333333);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(amount = 1)" ,0, canvas.height*.56, canvas.width*.2);

    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(canvas.width/2 - canvas.width*.1, canvas.height*.5, canvas.width*.2, canvas.height*.08333333);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(amount = 2)" ,canvas.width/2 - canvas.width*.1, canvas.height*.56, canvas.width*.2);

    c.fillStyle = "blue";
    c.strokeStyle = "white";
    c.fillRect(canvas.width*.8, canvas.height*.5, canvas.width*.2, canvas.height*.08333333);

    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("if(amount = 3)" ,canvas.width*.8, canvas.height*.56, canvas.width*.2);

//FINAL RECTANGLE: DISPLAYS THE FIRE FUNCTION
    c.fillStyle = "green";
    c.fillRect(canvas.width/2 - canvas.width*.2, canvas.height*.8333333, canvas.width*.4, canvas.height*.08333333);
    c.font = "20px Georgia";
    c.fillStyle = "white";
    c.fillText("fire(type, amount);" ,canvas.width/2-canvas.width*.2, canvas.height*.88, canvas.width*.4);
}


//**********************************************
//draw flow chart: this function utilizes the draw rows
//function to draw the rows for each conditional. Inside of
//the conditionals, lines are drawn according to what the user
//entered in the text boxes.
//**********************************************
function draw_flow_chart(t, a)
{ 
    if(!renderCF){
        return;
    }
    var canvas = document.getElementById("v_canvas");
    var c = canvas.getContext("2d");
    bRenderVars = false;
    c.fillStyle = "black";
    c.fillRect(0, 0, canvas.width, canvas.height);

       
      if(t == "1" && a == "1")
        {
  
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.0833333);
            c.lineTo(canvas.width*.1, canvas.height*.16666667);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width*.1, canvas.height*.25);
            c.lineTo(canvas.width*.1, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width*.1, canvas.height*.58333333);
            c.lineTo(canvas.width/2, canvas.height*.8333);
            c.stroke();
        }

      else if(t == "1" && a == "2")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.08333333);
            c.lineTo(canvas.width*.1, canvas.height*.17);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width*.1, canvas.height*.25);
            c.lineTo(canvas.width/2, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.5833333);
            c.lineTo(canvas.width/2, canvas.height*.8333333);
            c.stroke();
        }

      else if(t == "1" && a == "3")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.08333333);
            c.lineTo(canvas.width*.1, canvas.height*.17);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width*.1, canvas.height*.25);
            c.lineTo(canvas.width*.9, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width*.9, canvas.height*.583333);
            c.lineTo(canvas.width/2, canvas.height*.833333);
            c.stroke();

        }

      else if(t == "2" && a == "1")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.08333333);
            c.lineTo(canvas.width/2, canvas.height*.16666);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.25);
            c.lineTo(canvas.width*.1, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width*.1, canvas.height*.5833333);
            c.lineTo(canvas.width/2, canvas.height*.8333333);
            c.stroke();
        }

       else if(t == "2" && a == "2")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.083333);
            c.lineTo(canvas.width/2, canvas.height*.16666);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.25);
            c.lineTo(canvas.width/2, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.58333);
            c.lineTo(canvas.width/2, canvas.height*.83333);
            c.stroke();
        }

       else if(t == "2" && a == "3")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.083333);
            c.lineTo(canvas.width/2, canvas.height*.16666);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.25);
            c.lineTo(canvas.width*.9, canvas.height*.5);
            c.stroke(); 
            c.beginPath();
            c.moveTo(canvas.width*.9, canvas.height*.58333);
            c.lineTo(canvas.width/2, canvas.height*.83333);
            c.stroke();
        }

      else if(t == "3" && a == "1")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.08333);
            c.lineTo(canvas.width*.9, canvas.height*.16666);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width*.9, canvas.height*.25);
            c.lineTo(canvas.width*.1, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width*.1, canvas.height*.58333);
            c.lineTo(canvas.width/2, canvas.height*.83333);
            c.stroke();
        }

        else if(t == "3" && a == "2")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.08333);
            c.lineTo(canvas.width*.9, canvas.height*.16666);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width*.9, canvas.height*.25);
            c.lineTo(canvas.width/2, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.58333);
            c.lineTo(canvas.width/2, canvas.height*.83333);
            c.stroke();
            
        }

        else if(t == "3" && a == "3")
        {
            draw_rows(t, a, canvas, c);

            c.beginPath();
            c.moveTo(canvas.width/2, canvas.height*.08333);
            c.lineTo(canvas.width*.9, canvas.height*.16666);
            c.stroke();  


            c.beginPath();
            c.moveTo(canvas.width*.9, canvas.height*.25);
            c.lineTo(canvas.width*.9, canvas.height*.5);
            c.stroke(); 

            c.beginPath();
            c.moveTo(canvas.width*.9, canvas.height*.583333);
            c.lineTo(canvas.width/2, canvas.height*.83333);
            c.stroke();     
        }

    }
