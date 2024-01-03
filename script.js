import { BASE_R2_BUCKET_URL, R2_WEBP_IMAGES_PATH_SUFFIX_KEY } from './constants.js';
import { imgCountFromBucket, zeroPad } from './utils.js';

// I want to skip that image with my legs in it, makes the banner yucky!
const NUMBER_OF_IMAGES = imgCountFromBucket;
const LEG_INDEX = 23;

var randomPictureIndex = Math.ceil(Math.random() * NUMBER_OF_IMAGES);
randomPictureIndex = (randomPictureIndex === LEG_INDEX ? LEG_INDEX - 1 : randomPictureIndex);

const bannerImgUrl = BASE_R2_BUCKET_URL + R2_WEBP_IMAGES_PATH_SUFFIX_KEY + zeroPad(randomPictureIndex, 3) + ".webp"
document.getElementsByClassName("heading")[0].style.backgroundImage = "url('" + bannerImgUrl + "')";
document.getElementsByClassName("heading")[0].style.backgroundPositionY = Math.ceil(Math.random()*100) + "%";
