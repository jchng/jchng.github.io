import { BASE_R2_BUCKET_URL } from './constants.js';

const IMG_COUNT_URL = BASE_R2_BUCKET_URL + "count.txt";

const getImgCountFromBucket = () => {
    return fetch(IMG_COUNT_URL)
        .then(response => {
            if (!response.ok) return "0";
            return response.text();
        })
        .then(data => {
            return parseFloat(data);
        })
        .catch(_ => {
            return -1
        });
}

export const imgCountFromBucket = await getImgCountFromBucket();

export const zeroPad = (num, places)  => {
    return String(num).padStart(places, '0')
};
