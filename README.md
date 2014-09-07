Framelit v0.1.0
================

In short
---------
Normally, the first thing you do when starting a project is saddle yourself with technical debt.
Yay! All that manual directory creation, manual build steps, testing etc. get in your way from
that point forward.

This project is just about side stepping some of that.

You get:

* __A directory framework for your front end assets.__
* __Sensible__ `.jshintrc`, `.gitignore`, and `package.json`
* __A build script__ for compiling and minifying all your LESS/CSS and JS. Easy to include in your
pages: just `framelet.css` and `framelet.js`!
* __A JS testing setup__, should you decide to go for awesome dev practice right out of the box.
* __Travis CI integration__ so you can get your best practice on from the very start.
* __A dev build target__ that's super fast, keeps everything unminified, in its own files for
debugging, and *still* uses just `framelit.css` and `framelit.js`. No more dev specific including
for you!
* __A lightweight server__ using Express. Don't want it? Toss it out! This is just to get you 
started if Node/Express is your thing.

Just clone and go!


Quickstart
-----------
### Prereqs ###
1. [Node & NPM](http://nodejs.org/download/) - Where our magic comes from.
2. [Java](https://www.java.com/en/download/) - Yeah, I know, but the closure compiler runs on it,
so we've gotta get our JAR on.

### Initializing the project ###
1. [Clone](https://github.com/betaorbust/framelit) or 
[download](https://github.com/betaorbust/framelit/archive/master.zip) the project.
2. Open your terminal and head over to wherever you put the project, let's say
`~/Documents/framelit`.
3. Type `sudo npm install` and hit enter.

### Your first build ###
1. Type `grunt` and hit enter.
2. Go check out the `./src/static/minified/` !  
You should have a `css_min` and a `js_min` folder with a framelit.min file and a standalone
directory. These are just built off of the default example files in the project (we'll get rid of
them later)

### Your first dev build ###
1. Type `grunt dev` and hit enter.
2. Go check out the `./src/static/minified/` !  
You will have a `framelit.min.css` and `framelit.min.js` files still, but they're just proxy files
that will load the other files that you'll now see in the minified directories. This is especially
good for debugging. You'll also notice this build was much faster than the closure compiled 
production build you tried above.

### Running Express ###
1. Type `npm start` and that's pretty much it.
2. Go to [127.0.0.1:3000](http://127.0.0.1:3000) and see your start page.

In longer
----------

### Why? ###
This project came about because every time I started a project, the following happened:

* On a small project, you spend a bunch of time manually setting up directories, compiling
stylesheets, copying build files, etc. That sucks! By the time you get to code, you're not as
excited about the idea as you were a couple hours ago!
* On a large project, you *start* with a small project, and then eventually have to go back and fix
your early hackery; adding in a *real* build system, adding some *real* tests, doing some *real*
optimization, and you find, almost without fail, that you have spent waaay more time than you
should have turning your quick hacks into something you can maintain. Boo!

So framelit was born. It is a lightly opinionated way of organizing front end assets to allow for
awesome build system magics, easy testing, and easy optimization.

### How? ###
The general idea is that your assets fit into the following structure:

````
src
|-- static
    |-- css
    |   |-- components
    |   |-- site
    |   `-- vendor
    `-- js
        |-- site
        `-- vendor
````

* `site` -- Stuff you made!
  *Your angular app, your main.js, etc.*
* `components` -- Stuff your `site` assets use to build themselves, but not things that stand
alone. Currently only for CSS as I haven't come up with a JS use case.
  *Chunks of bootstrap that you want to @include from your own files.*
* `vendor` -- Stuff you didn't make but want to use.
  *Jquery, angular, etc.*


But what about stuff you don't want built into your main site js or css?? **blamo** Got you covered.
For both CSS and JS, there are standalone directories that allow you to have elements of your code
compiled and served, but not built into the main CS and JS files.

````
src
|-- static
    |-- css
    |   |-- components
    |   |-- site
    |   |-- vendor
    |   `-- standalone
    |       |-- site
    |       `-- vendor
    `-- js
        |-- site
        |-- vendor
        `-- standalone
            |-- site
            `-- vendor
````




