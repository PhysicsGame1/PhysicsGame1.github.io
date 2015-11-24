//global variables used in formulas
var initial_velocity = 150; 
var cannon_theta = 45;
var cannon_height_value = 0;
var cannon_height = 16;  

$(document).ready(function(){
  $("#v_value").val(initial_velocity);
  $("#t_value").val(cannon_theta);
  $("#h_value").val(cannon_height_value);

  //increment values
  $(".inc_btn").click(function(){
    var variable = $(this).siblings(".input_value").attr("id");
    var value = $(this).siblings(".input_value").val();
    value++;
    $(this).siblings(".input_value").val(value);
    updateValue(variable, value);
  });

  //decrement values
  $(".dec_btn").click(function(){
    var variable = $(this).siblings(".input_value").attr("id");
    var value = $(this).siblings(".input_value").val();
    value--;
    $(this).siblings(".input_value").val(value);
    updateValue(variable, value);
  });

  $("#start_stop_btn").mousedown(function(){
    if($(this).text() == "Start"){
      $(this).text("Stop");

      initial_velocity = $("#v_value").val(); //makes sure the values are updated 
      cannon_theta = $("#t_value").val();     //important for the case where the user manually 
      cannon_height = $("#h_value").val();    //enters a value but instead of hitting a button
      reload();

      $(".input_value").prop('disabled',true);  //user can't change input again until reset
      $(".inc_btn").prop('disabled',true);
      $(".dec_btn").prop('disabled',true);
    }
    else if($(this).text() == "Stop"){
      $(this).text("Start");
    }
  });

  $("#reset_btn").click(function(){
    if(runAnimation.value)
      runAnimation.value = !runAnimation.value; //stops animation
    $(".input_value").prop('disabled',false); //enables input
    $(".inc_btn").prop('disabled',false);
    $(".dec_btn").prop('disabled',false);
    $("#start_stop_btn").text("Start");       //makes sure button text is correct
    reload();                                 //reset the ball
  });

  function updateValue(variable, value){  
    if(variable == "v_value")
      initial_velocity = value;
    else if(variable == "t_value")
      cannon_theta = value;
    else if(variable == "h_value"){
      cannon_height = value + 16;
      cannon_height_value = value;
    }
    reload();
  }

  //visualization selection
  $(".vis_tab").click(function(){
    if($(this).attr("id") == "cf_tab"){
      $("#cf_tab").css({"background-color":"#aaa"});
      $("#vis_selector").css({"background-color":"#f0f0f0"});  //make v_tab the original color
    }else{  //id == v_tab
      $("#cf_tab").css({"background-color":"#f0f0f0"});   //make cf_tab the original color
      $("#vis_selector").css({"background-color":"#aaa"}); 
    }
  });

});