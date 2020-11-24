# see https://github.com/biohackrxiv/bhxiv-gen-pdf
cd ../
docker run --rm -it -v $(pwd):/work -w /work biohackrxiv/gen-pdf:local gen-pdf --debug /work/paper/ BH20EU

