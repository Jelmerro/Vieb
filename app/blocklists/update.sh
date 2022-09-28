cd $(dirname $(realpath $0))
curl https://easylist-downloads.adblockplus.org/easylist.txt > easylist.txt
curl https://easylist-downloads.adblockplus.org/easyprivacy.txt > easyprivacy.txt
curl https://raw.githubusercontent.com/ghostery/adblocker/master/packages/adblocker/assets/ublock-origin/resources.txt > resources
