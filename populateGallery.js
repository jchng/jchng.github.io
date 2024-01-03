import { BASE_R2_BUCKET_URL, R2_THUMBNAIL_PATH_SUFFIX_KEY } from './constants.js';
import { imgCountFromBucket, zeroPad } from './utils.js';

const IMG_FETCH_LIMIT = imgCountFromBucket;
const IMG_FETCH_CHUNK_SIZE = 8;

export const fetchImagesInChunks = () => {
    const imageContainer = document.getElementById('imageContainer');
    const lastImgId = imageContainer.childElementCount;

    var fetchedCount = 0;
    while (
        imageContainer.childElementCount < IMG_FETCH_LIMIT &&
        fetchedCount < IMG_FETCH_CHUNK_SIZE
    ) {
        const imgElement = document.createElement('img');
        const filename = (
            R2_THUMBNAIL_PATH_SUFFIX_KEY +
            zeroPad(IMG_FETCH_LIMIT - (lastImgId + fetchedCount), 3)
            + ".webp"
        );
        fetchedCount++;
        imgElement.src = BASE_R2_BUCKET_URL + filename;
        imageContainer.appendChild(imgElement);
    };

    // That's all we have. Hide button.
    if (imageContainer.childElementCount == IMG_FETCH_LIMIT) {
        const loadMoreButton = document.getElementsByClassName('load-button')[0];
        loadMoreButton.style.display = "none";
    }
}

const autoFetchOnScroll = () => {
    window.onscroll = function(ev) {
        if (
            (window.innerHeight + Math.round(window.scrollY))
            >= document.body.offsetHeight - 500
        ) {
            fetchImagesInChunks();
        }
    };
}

fetchImagesInChunks();
autoFetchOnScroll();
