file=$(ls ~/.cache/electron-builder/fpm/*/lib/app/lib/fpm/package/rpm.rb)
patch="441a442\n>       \"--buildroot\", \"#{build_path}/BUILD\","
echo -e "$patch"
echo -e "$patch" | patch -fR $file
echo -e "$patch" | patch -f $file
