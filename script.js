const NUMBER_OF_IMAGES = 26; // A wonderful magic number!
const LEG_INDEX = 23;
var randomPictureIndex = Math.round(Math.random()*NUMBER_OF_IMAGES);
// I want to skip that image with my legs in it, makes the banner yucky!
randomPictureIndex = (randomPictureIndex === LEG_INDEX ? LEG_INDEX - 1 : randomPictureIndex);
document.getElementsByClassName("heading")[0].style.backgroundImage = "url('./img/img" + randomPictureIndex  + ".jpg')" 
document.getElementsByClassName("heading")[0].style.backgroundPositionY = Math.ceil(Math.random()*100) + "%";