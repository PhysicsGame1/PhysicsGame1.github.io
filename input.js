//global variables used in formulas
var initial_velocity = 150; 
var cannon_theta = 45;
var cannon_height_value = 0;
var cannon_height = 16;  

$(document).ready(function(){
  function linkToGame(){
    window.location.assign('/');
  }
  //visualization selection
  $(".vis_tab").click(function(){
    if($(this).attr("id") == "a_tab"){
      $("#a_tab").css({"background-color":"#aaa"});     //make a_tab selected color
      $("#v_tab").css({"background-color":"#f0f0f0"});  //make other tabs original color
      $("#cf_tab").css({"background-color":"#f0f0f0"}); 
    }else if($(this).attr("id") == "v_tab"){
      $("#v_tab").css({"background-color":"#aaa"});     //make v_tab selected color
      $("#a_tab").css({"background-color":"#f0f0f0"});  //make other tabs original color
      $("#cf_tab").css({"background-color":"#f0f0f0"});  
    }else if($(this).attr("id") == "cf_tab"){
      $("#cf_tab").css({"background-color":"#aaa"});    //make cf_tab selected color
      $("#a_tab").css({"background-color":"#f0f0f0"});  //make other tabs original color
      $("#v_tab").css({"background-color":"#f0f0f0"});  
    }
  });

  $(".nav").children("ul").mouseover(function(){
    $(this).parent().children("a").css({"background-color":"#006600"});
  }).mouseout(function(){
    $(this).parent().children("a").css({"background-color":"#009900"});
  });

  $(window).resize(resizeCanvases);
  function resizeCanvases(){
    if(window.innerWidth <= 1550){
      document.getElementById('physicsCanvas').width = 900;
      document.getElementById('physicsCanvas').height = 550;
      document.getElementById('v_canvas').width = 450;
      document.getElementById('v_canvas').height = 515;

    }else{  //width >= 1500
      document.getElementById('physicsCanvas').width = 1024;
      document.getElementById('physicsCanvas').height = 600;
      document.getElementById('v_canvas').width = 500;
      document.getElementById('v_canvas').height = 560;
    }
  }
  resizeCanvases(); //call when page loads
});