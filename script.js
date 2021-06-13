const NUMBER_OF_IMAGES = 19; // magic number much
const LEG_INDEX = 14;

var randomPicIdx = Math.round(Math.random()*NUMBER_OF_IMAGES);
// I want to skip that image with my legs in it, makes the website yucky!
randomPicIdx = (randomPicIdx === LEG_INDEX ? LEG_INDEX - 1 : randomPicIdx)

document.getElementsByClassName("heading")[0].style.backgroundImage = "url('./img/img" + randomPicIdx  + ".jpg')" 
document.getElementsByClassName("heading")[0].style.backgroundPositionY = Math.ceil(Math.random()*100) + "%";
// background-size: 100%;
// background-position-y: 100%;
  