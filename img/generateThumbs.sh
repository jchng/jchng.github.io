#!/bin/bash
# Renames files and generates thumbnails of images in directory
echo 'Compiling images.. takes a few seconds.'
ls -v *.jpg | cat -n | while read n f; do mv -n "$f" "temp$n.jpg"; done && ls -v  *.jpg | cat -n | while read n f; do mv -n "$f" "img$n.jpg"; done && rm -rf ./thumbs/ && mkdir thumbs && ls -1 *.jpg | xargs -n 1 bash -c  'convert $0 -thumbnail 500x500^ -gravity center -extent 500x500 -auto-orient ./thumbs/$0'