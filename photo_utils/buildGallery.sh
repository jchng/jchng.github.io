#!/bin/bash

PATH_RAW_IMGS=./imgs/
PATH_SUFFIX_IMG_THUMBS=thumbs/
PATH_IMG_COUNT_FILE=./count.txt

echo "Indexing $PATH_RAW_IMGS..."
ls -v  $PATH_RAW_IMGS*.jpg | cat -n | while read n f; do mv "$f" "$PATH_RAW_IMGS$(printf "%03d" $n).jpg"; done

echo "Creating thumbnails $PATH_RAW_IMGS$PATH_SUFFIX_IMG_THUMBS..."
rm -rf $PATH_RAW_IMGS$PATH_SUFFIX_IMG_THUMBS && mkdir $PATH_RAW_IMGS$PATH_SUFFIX_IMG_THUMBS

cd $PATH_RAW_IMGS
ls -1 *.jpg | xargs -P 4 -n 1 bash -c 'convert $0 -quality 90% -thumbnail 500x500^ -gravity center -extent 500x500 -auto-orient '"$PATH_SUFFIX_IMG_THUMBS"'$0'
cd ..

echo "Counting and writing $PATH_IMG_COUNT_FILE..."
ls -1 $PATH_RAW_IMGS*.jpg | wc -l | tr -d '[:blank:]' > $PATH_IMG_COUNT_FILE
echo "Generated $(cat count.txt) thumbnails."
