# Using docker: see https://github.com/biohackrxiv/bhxiv-gen-pdf
cd ../
docker run --rm -it -v $(pwd):/work -w /work biohackrxiv/gen-pdf:local gen-pdf --debug /work/paper/ BH20EU

# Using pandoc directly
pandoc -V journal_name='BioHackrXiv.org' -V journal_url='https://biohackrxiv.org/' -V logo_path='/home/john/repos/bhxiv-gen-pdf/resources/biohackrxiv/logo.png' -V year='2020' -V submitted='24 Dec 2020' -V git_url='https://github.com/biohackrxiv/bhxiv-gen-pdf' -V event_title='BioHackathon Europe 2020' -V event_url='https://www.biohackathon-europe.org//' -V event_location='Virtual conference 2020' -V geometry:margin=1in --from markdown+autolink_bare_uris --template '/home/john/repos/bhxiv-gen-pdf/resources/biohackrxiv/latex.template' --csl=/home/john/repos/bhxiv-gen-pdf/resources/biohackrxiv/apa.csl --citeproc -s --output='paper.pdf' paper.md

