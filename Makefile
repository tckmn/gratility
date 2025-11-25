.PHONY: all

all: dist/gratility.js dist/gratility.css

dist/gratility.js: $(wildcard src/*.ts src/*/*.ts)
	tsc

dist/gratility.css: src/gratility.scss
	sassc $< $@
