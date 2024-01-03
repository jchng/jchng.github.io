#!/bin/bash

PATH_RAW_IMGS=./imgs/
PATH_SUFFIX_IMG_THUMBS=thumbs/
PATH_SUFFIX_IMG_WEBP=webps/
PATH_IMG_COUNT_FILE=./count.txt

echo "Indexing $PATH_RAW_IMGS..."
ls -v  $PATH_RAW_IMGS*.jpg | cat -n | while read n f; do mv "$f" "$PATH_RAW_IMGS$(printf "%03d" $n).jpg"; done

cd $PATH_RAW_IMGS
echo "Creating webps $PATH_RAW_IMGS$PATH_SUFFIX_IMG_WEBP..."
rm -rf ./$PATH_SUFFIX_IMG_WEBP && mkdir ./$PATH_SUFFIX_IMG_WEBP
ls -1 *.jpg | sed -e 's/\.jpg$//' | xargs -P 4 -n 1 bash -c 'convert $0.jpg -quality 65 -define webp:method=6 -auto-orient '"$PATH_SUFFIX_IMG_WEBP"'$0.webp'

echo "Creating thumbnails $PATH_RAW_IMGS$PATH_SUFFIX_IMG_THUMBS..."
rm -rf ./$PATH_SUFFIX_IMG_THUMBS && mkdir ./$PATH_SUFFIX_IMG_THUMBS
ls -1 *.jpg | sed -e 's/\.jpg$//' | xargs -P 4 -n 1 bash -c 'convert $0.jpg -quality 65 -define webp:method=6 -thumbnail 1000x1000^ -gravity center -extent 1000x1000 -auto-orient '"$PATH_SUFFIX_IMG_THUMBS"'$0.webp'
cd ..

echo "Counting and writing $PATH_IMG_COUNT_FILE..."
ls -1 $PATH_RAW_IMGS*.jpg | wc -l | tr -d '[:blank:]' > $PATH_IMG_COUNT_FILE
echo "Converted $(cat count.txt) jpgs into webps and webp thumbnails."
