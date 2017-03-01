#minify
./minify.sh

#remove old files
echo 'removing old files'
rm ../../Spliter/flexLayout/flexlayout.js ../../Spliter/flexLayout/flexlayout.min.js

#copy new files
echo 'copying new files'
cp -a ./dist/flexlayout/. ../../Spliter/flexLayout/

#cd to flexlayout folder and publish with given tag
cd ../../Spliter/flexLayout
#commit and push
git pull
git add --all
git commit -am "sync upgrade to $1"
git push origin master
#create tag
git tag -a $1 -m "sync upgraded to $1"
git push origin --tag
#update flexlayout own site
./minify.sh $1