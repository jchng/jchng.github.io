import { BASE_R2_BUCKET_URL, R2_THUMBNAIL_PATH_SUFFIX_KEY } from './constants.js';
import { imgCountFromBucket, zeroPad } from './utils.js';

const imageContainer = document.getElementById('imageContainer');

for (let imgId = imgCountFromBucket; imgId > 0; imgId--) {
    const imgElement = document.createElement('img');
    const filename = R2_THUMBNAIL_PATH_SUFFIX_KEY + zeroPad(imgId, 3) + ".jpg";
    imgElement.src = BASE_R2_BUCKET_URL + filename;
    imageContainer.appendChild(imgElement);
};
