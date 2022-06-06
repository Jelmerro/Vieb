cd $(dirname $(realpath $0))
curl https://easylist.to/easylist/easylist.txt > easylist.txt
curl https://easylist.to/easylist/easyprivacy.txt > easyprivacy.txt
curl https://raw.githubusercontent.com/ghostery/adblocker/master/packages/adblocker/assets/ublock-origin/resources.txt > resources
