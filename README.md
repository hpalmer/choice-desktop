### Window Manager and Tools for the Stanford GSE AAALab Choice Server

#### Introduction

This is the primary platform for managing the Choice Server. The browser-based
window manager is written in [Scala.js](https://www.scala-js.org/), and displays
"windows" within a browser window. The windows typically run one of the tools
supplied with the choice-desktop.

The tools currently included are:

  * File Browser
  
    The server uses its own "filesystem" for its content. This tool provides a
    modest GUI for browsing that filesystem.
  
  * File Upload
  
    This tool provides a GUI for uploading content to the server. Individual files
    or zipped content can be uploaded, with various options for replacement of
    existing content.
    
  * Text Editor
  
    This is the [Ace](https://ace.c9.io/) editor, which can used to edit files directly on the server.
    
  * Terminal
  
    This is a terminal emulator window, which accepts commands to manage the server.
    The command language features filename completion and command parameter prompt
    strings.
    
Currently the tool configuration of the window manager is hard-coded. The intent is
that it will be dynamically configurable someday.

#### Prerequisites

The Choice desktop assumes that it is served by a Choice server. The individual
desktop tools are written in ES2015 (ES6), which is transpiled for deployment.
The build requires [sbt](https://www.scala-sbt.org/) for the window manager,
and [jspm](https://jspm.io/) to build the tools.

If you have [node.js](https://nodejs.org/en/) installed, then you probably have
the ```npm``` command. From there you get ```jspm``` with:

  ```
  cd webstuff
  npm install jspm
  export PATH="`pwd`/node_modules/.bin:$PATH"
  ```

#### Build

The build goes like this, once you have ```sbt``` and ```jspm```:

  ```
  cd scalajs
  sbt clean fastOptJS fullOptJS
  cd ../webstuff
  jspm install
  ./bundle.sh
  cd ..
  ./mkjar
  ```

Note that running ```bundle.sh``` and ```mkjar``` file assumes these are executable in your
environment.

This should produce ```fsdesktop.jar``` which can be uploaded to a Choice server
using either its ```boot.html``` page or the file upload tool of a previously
install Choice desktop.
