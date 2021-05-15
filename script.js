const NUMBER_OF_IMAGES = 19; // magic number much
document.getElementsByClassName("heading")[0].style.backgroundImage = "url('./img/img" + Math.round(Math.random()*NUMBER_OF_IMAGES) + ".jpg')" 
document.getElementsByClassName("heading")[0].style.backgroundPositionY = Math.ceil(Math.random()*100) + "%";
// background-size: 100%;
// background-position-y: 100%;
  