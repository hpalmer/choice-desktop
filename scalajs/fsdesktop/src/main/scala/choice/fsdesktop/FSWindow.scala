/**
  * Copyright © 2014-2016 The Board of Trustees of The Leland Stanford Junior University.
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *
  *     http://www.apache.org/licenses/LICENSE-2.0
  *
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
  */
/**
  * An FSDesktop window.
  *
  * @author Howard Palmer
  */
package choice.fsdesktop

import choice.fsdesktop.FSWindow._
import org.querki.jquery._
import org.scalajs.dom
import org.scalajs.dom.html.IFrame
import scalatags.Text
import scalatags.Text.all._

import scala.collection.mutable.ListBuffer
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{Future, Promise}
import scala.scalajs.js

/**
 * Window class.
 */
class FSWindow(val winName : String, val sourceUrl : Option[String], val options : Option[WindowOptions]) {

    val winoptions : WindowOptions = options.getOrElse(WindowOptions.defaultOptions)

    private var openPromise : Promise[String] = _
    private var minimizePromise : Promise[String] = _
    private var closePromise : Promise[String] = _
    private var destroyPromise : Promise[String] = _
    private var loadPromise : Promise[String] = _

    private var _isOpen = false
    private var _isLoaded = false
    private var _isMinimized = false
    private var _isMaximized = false

    private var title : String = winoptions.title
    private var normalWidth : Double = winoptions.width
    private var normalHeight : Double = winoptions.height
    private var lastLeft : Double = winoptions.left
    private var lastTop : Double = winoptions.top

    // modal not yet implemented
//    private val _modal = winoptions.modal
    private var resizerOpt : Option[Resizer] = None

    val windowElement : JQuery = {
        val windiv : Text.TypedTag[String] = {
            div(id := winName, `class` := "window")(
                header(`class` := "winhdr")(
                    div(`class` := "wintitle")(title),
                    div(`class` := "wincontrols")(
                        div(`class` := "winmax")(),
                        div(`class` := "winrestore")(),
                        div(`class` := "winclose")()
                    )
                ),
                div(`class` := "winframe")(
                    sourceUrl match {
                        case Some(url) ⇒
                            //                    val augUrl =
                            //                        if (url.lastIndexOf('?') >= 0) s"$url&window=$winName"
                            //                        else s"$url?window=$winName"
                            iframe(name := winName, src := url)
                        case None ⇒ iframe(name := winName)
                    }
                )
            )
        }

        $(windiv.toString()).appendTo("#desktop")
    }

    resize(normalWidth, normalHeight)
    $(".winframe", windowElement).css("background-color", winoptions.backgroundColor)
    windowElement.css(js.Dictionary[js.Any]("top" → lastTop.toInt, "left" → lastLeft.toInt))
    if (winoptions.closed) {
        windowElement.hide()
    }
    else {
        open()
    }

    windowIframe.on(s"load.$winName", loadHandler _)

    private def windowIframe : JQuery = $("iframe:first", windowElement)

    def iframeListener(e : dom.Event) : Boolean = {
//        println("iframe click")
        mouseClickHandler(null)
        false
    }

    def mouseOn() : Unit = {
        val iframeWindow = windowElement(0).querySelector("iframe").asInstanceOf[IFrame]
            .contentWindow
        Option(iframeWindow).foreach(_.addEventListener("click", iframeListener _, useCapture = false))
        windowElement.on(s"mousemove.$winName", mouseMoveHandler _)
        windowElement.on(s"click.$winName", mouseClickHandler _)
        val closeMethod = if (winoptions.selfClosing) closeRequest _ else destroy _
        $(".winclose", windowElement).on(s"click.$winName", closeMethod)
            .on(s"dblclick.$winName", destroy _)
        $(".winrestore", windowElement).on(s"click.$winName", restore _)
        $(".winmax", windowElement).on(s"click.$winName", maximize _)
    }

    def mouseOff() : Unit = {
        val iframeWindow = windowElement(0).querySelector("iframe").asInstanceOf[IFrame]
            .contentWindow
        Option(iframeWindow).foreach(_.removeEventListener("click", iframeListener _))
        windowElement.off(s".$winName")
    }

    private def loadHandler(evt : JQueryEventObject) : js.Any = {
        println(s"$winName loaded")
        windowIframe.off(s"load.$winName")
        _isLoaded = true
        if (loadPromise != null) {
            loadPromise.success(winName)
            loadPromise = null
        }
    }

    def onLoad : Future[String] = {
        if (_isLoaded) Future.successful(winName)
        else {
            if (loadPromise == null) {
                loadPromise = Promise[String]()
            }
            loadPromise.future
        }
    }

    def isOpen : Boolean = _isOpen

    def onOpen : Future[String] = {
        if (_isOpen) Future.successful(winName)
        else {
            if (openPromise == null) {
                openPromise = Promise[String]()
            }
            openPromise.future
        }
    }

    def onMinimize : Future[String] = {
        if (_isMinimized) Future.successful(winName)
        else {
            if (minimizePromise == null) {
                minimizePromise = Promise[String]()
            }
            minimizePromise.future
        }
    }

    def restore() : Unit = {
        println(s"restoring $winName")
        if (_isMinimized || _isMaximized) {
            _isMinimized = false
            _isMaximized = false
            setPosition(lastLeft, lastTop)
            resize(normalWidth, normalHeight)
            this.show()
        }
        else {
            resize(0, 0)
            _isMinimized = true
        }
    }

    def maximize() : Unit = {
        val w = $(dom.window).innerWidth() - 12
        val h = $(dom.window).innerHeight() - 26 - 23 - 12
        setPosition(0, 0)
        resize(w, h)
        _isMaximized = true
        _isMinimized = false
        show()
    }

    def onClose : Future[String] = {
        if (!_isOpen) Future.successful(winName)
        else {
            if (closePromise == null) {
                closePromise = Promise[String]()
            }
            closePromise.future
        }
    }

    def onDestroy : Future[String] = {
        if (destroyPromise == null) {
            destroyPromise = Promise[String]()
        }
        destroyPromise.future
    }

    def open() : Unit = {
        if (!_isOpen) {
            FSWindow.opened(this)
            windowElement.css("display", "block")
            mouseOn()
            _isOpen = true
            if (openPromise != null) {
                openPromise.success(winName)
                openPromise = null
            }
            println(s"$winName opened")
        }
        show()
    }

    def show() : Unit = {
        FSWindow.moveToTop(this)
        windowElement.show()
        val contentWindow = $("iframe", windowElement)(0).asInstanceOf[IFrame].contentWindow
        $(contentWindow).focus()
    }

    def setZIndex(z : Int) : Unit = {
        windowElement.css("z-index", z)
    }

    def setPosition(left : Double, top : Double) : Unit = {
//        println(s"setPosition($left, $top)")
        val desktop = $("#desktop")
        val newLeft = Math.max(50 - windowElement.width(), Math.min(desktop.width() - 50, left)).toInt
        val newTop = Math.max(0, Math.min(desktop.height() - 23, top)).toInt
        windowElement.css(js.Dictionary[js.Any]("left" → s"${newLeft}px", "top" → s"${newTop}px"))
    }

    def resize(width : Double, height : Double) : (Double, Double) = {
        val w = Math.max(0, width.toInt)
        val h = Math.max(0, height.toInt)
        windowIframe.add($(".winframe", windowElement))
            .css(js.Dictionary[js.Any]("width" → s"${w}px", "height" → s"${h}px"))
        (w, h)
    }

    protected def mouseClickHandler(e : JQueryEventObject) : js.Any = {
        if (_isOpen) {
            show()
        }
    }

    protected def mouseMoveHandler(e : JQueryEventObject) : js.Any = {
        val pos = desktopElement.position()
        val pageX = e.pageX.toDouble - pos.left
        val pageY = e.pageY.toDouble - pos.top
        resizerOpt match {
            case Some(resizer) ⇒ resizer.update(pageX, pageY)
            case None ⇒
                resizerAnalysis(pageX, pageY) match {
                    case Some((_, _, _, _, cursorType)) ⇒
                        if (!_isMinimized && !_isMaximized) {
                            catchMouse(cursorType)
                        }
                        else if (_isMinimized && (cursorType == "move")) {
                            catchMouse(cursorType)
                        }
                    case None ⇒
                        uncatchMouse()
                }
        }
    }

    protected def catchMouse(cursorType : String) : Unit = {
        if ($("#mousecatcher").length <= 0) {
            val mouseCatcher = div(id := "mousecatcher")()
            $("body").append(mouseCatcher.toString())
            $("#mousecatcher")
                .on("mousemove.MouseCatcher", mouseMoveHandler _)
                .on("mousedown.MouseCatcher", mouseDown _)
                .on("mouseup.MouseCatcher", mouseUp _)
//            println("mouse catcher enabled")
        }
        $("#mousecatcher").css(js.Dictionary[js.Any]("cursor" → cursorType /*, "z-index" → 20000*/))
    }

    protected def uncatchMouse() : Unit = {
        $("#mousecatcher").off(".MouseCatcher").remove()
//        println("mouse catcher disabled")
    }

    protected def mouseDown(evt : JQueryEventObject) : js.Any = {
        val pos = desktopElement.position()
        val pageX = evt.pageX.toDouble - pos.left
        val pageY = evt.pageY.toDouble - pos.top
        resizerAnalysis(pageX, pageY) foreach { resizerDirections ⇒
            resizerOpt = Some(Resizer(this, resizerDirections, pageX, pageY))
        }
    }

    protected def mouseUp(evt : JQueryEventObject) : js.Any = {
        resizerOpt = None
        $("#mousecatcher").off(".FSWindow").remove()
    }

    def adjustSize(dx : Double, dy : Double) : (Double, Double) = {
        val iframe = windowIframe
        val newWidth = iframe.outerWidth(true) + dx
        val newHeight = iframe.outerHeight(true) + dy
        normalWidth = newWidth
        normalHeight = newHeight
        resize(newWidth, newHeight)
    }

    def adjustPosition(dx : Double, dy : Double) : (Double, Double) = {
        val pos = windowElement.position()
        val newLeft = pos.left + dx
        val newTop = pos.top + dy
        lastLeft = newLeft
        lastTop = newTop
        setPosition(newLeft, newTop)
        (newLeft, newTop)
    }

    def setTitle(title : String) : Unit = {
        this.title = title
        $(".wintitle:first", windowElement).html(title)
    }

    def closeRequest() : Unit = {
        if (closePromise != null) {
            closePromise.success(winName)
            closePromise = null
        }
    }

    def close() : Unit = {
        println(s"close window $winName")
        if (_isOpen) {
            windowElement.css("display", "none")
            mouseOff()
            _isOpen = false
            FSWindow.closed(this)
            println(s"$winName closed")
        }
        closeRequest()
    }

    def destroy() {
        println(s"destroy window $winName")
        if (_isOpen) {
            close()
        }
        FSWindow.destroyed(this)
        windowElement.remove()
        if (destroyPromise != null) {
            destroyPromise.success(winName)
            destroyPromise = null
        }
    }

    def relativeCoords(pageX : Double, pageY : Double) : (Double, Double) = {
        val obj = windowElement.position()
        val x = pageX - obj.left
        val y = pageY - obj.top
        (x, y)
    }

    def inWindow(x : Double, y : Double, expansionPixels : Int = 0) : Boolean = {
        val xlow = -expansionPixels
        val xhigh = windowElement.outerWidth(includeMargin = true) + expansionPixels
        val ylow = -expansionPixels
        val yhigh = windowElement.outerHeight(includeMargin = true) + expansionPixels
        (x >= xlow) && (x <= xhigh) && (y >= ylow) && (y <= yhigh)
    }

    private def xNearLeft(x : Double)(implicit margin : Int = 3) : Boolean = { x >= -margin && x <= margin }
    private def xNearRight(x : Double)(implicit margin : Int = 3) : Boolean = {
        val width = windowElement.outerWidth(includeMargin = true)
        x >= (width-margin) && x <= (width+margin)
    }
    private def yNearTop(y : Double)(implicit margin : Int = 3) : Boolean = { y >= -margin && y <= margin }
    private def yNearBottom(y : Double)(implicit margin : Int = 3) : Boolean = {
        val height = windowElement.outerHeight(includeMargin = true)
        y >= (height-margin) && y <= (height+margin)
    }
    private def xyInHeader(x : Double, y : Double) : Boolean = {
        val result = (x >= 10) && (y >= 4) && {
            val winelem = windowElement
            val owidth = winelem.outerWidth(includeMargin = true)
            (x < (owidth-64)) && (y <= 20)
        }
//        println(s"xyInHeader: ($x, $y) $result")
        result
    }

    def resizerAnalysis(pageX : Double, pageY : Double) : Option[ResizerDirections] = {
        val (relX, relY) = relativeCoords(pageX, pageY)
        val width = windowElement.outerWidth(true) + 3
        val height = windowElement.outerHeight(true) + 3
        val result = {
            // First check that the cursor is somewhere near the boundary of the window
            if ((relX >= -3) && (relX <= width) && (relY >= -3) && (relY <= height)) {
                if (xNearLeft(relX)(10)) {
                    if (yNearTop(relY)(6)) {
                        Some(resizeUpperLeft)
                    }
                    else if (xNearLeft(relX)(6)) {
                        if (yNearBottom(relY)(6)) {
                            Some(resizeLowerLeft)
                        }
                        else if (!yNearTop(relY)(10)) {
                            Some(resizeLeftMiddle)
                        }
                        else None
                    }
                    else None
                }
                else if (xNearRight(relX)(10)) {
                    if (xNearRight(relX)(6) && yNearTop(relY)(6)) {
                        Some(resizeUpperRight)
                    }
                    else if (xNearRight(relX)(6)) {
                        if (yNearBottom(relY)(6)) {
                            Some(resizeLowerRight)
                        }
                        else {
                            Some(resizeRightMiddle)
                        }
                    }
                    else None
                }
                else {
                    val hdrElement = $("header", windowElement)
                    val hdrHeight = hdrElement.outerHeight(true)
                    val hdrWidth = hdrElement.outerWidth(true)
                    val btnWidth = $(".wincontrols", windowElement).outerWidth(true)
                    if (yNearTop(relY)(hdrHeight.toInt - 3)) {
                        if (relX < (hdrWidth - btnWidth)) {
                            if (xyInHeader(relX, relY)) {
                                Some(resizeActuallyMove)
                            }
                            else {
                                Some(resizeUpperMiddle)
                            }
                        }
                        else None
                    }
                    else if (yNearBottom(relY)(6)) {
                        Some(resizeLowerMiddle)
                    }
                    else None
                }
            }
            else None
        }
        result match {
            case Some((_, _, _, _, ctype)) if ctype != lastCursorType ⇒
//                println(s"$ctype: relX = $relX, relY = $relY")
                lastCursorType = ctype
            case _ ⇒
        }
        result
    }
}

object FSWindow {
    val desktopElement = $("#desktop")
    private var allWindows : List[FSWindow] = Nil
    private var winStack : List[FSWindow] = Nil
    private var minWindows : List[FSWindow] = Nil
    private var winIndex = js.Date.now().toLong

    def apply(sourceUrl : Option[String], options : Option[WindowOptions] = None) : FSWindow = {
        if (allWindows.isEmpty) init()
        winIndex += 1
        val winName = s"win$winIndex"
        val newwin = new FSWindow(winName, sourceUrl, options)
        allWindows = newwin :: allWindows
        println(s"added window ${newwin.winName} to allWindows (length ${allWindows.length})")
        newwin
    }

    def init() : Unit = {
//        mouseOn()
    }

    def getWindow(winName : String) : Option[FSWindow] = {
        val result = allWindows find (_.winName == winName)
        if (result.isEmpty) {
            println(s"getWindow($winName) fails")
            val names = allWindows.map(_.winName).mkString(", ")
            println(s"${allWindows.length} windows in allWindows: $names")
        }
        result
    }

    def opened(window : FSWindow) : Unit = {
        moveToTop(window)
    }

//    def minimized(window : FSWindow) : Unit = {
//        winStack = removeFromList(window, winStack)
//        minWindows = window :: minWindows
//        FSDesktop.minimize(window)
//    }

    def closed(window : FSWindow) : Unit = {
        winStack = removeFromList(window, winStack)
    }

    def destroyed(window : FSWindow) : Unit = {
        winStack = removeFromList(window, winStack)
        allWindows = removeFromList(window, allWindows)
        println(s"removed window ${window.winName} from allWindows (remaining ${allWindows.length})")
    }

    def restore(windowId : String) : Unit = {
        println(s"request to restore window $windowId")
        minWindows find (_.winName == windowId) foreach { window ⇒
            window.restore()
            minWindows = removeFromList(window, minWindows)
        }
    }

    def removeFromList(win : FSWindow, list : List[FSWindow]) : List[FSWindow] = {
        def helper(remaining : List[FSWindow], acc : ListBuffer[FSWindow]) : List[FSWindow] = {
            remaining match {
                case Nil ⇒ acc.toList
                case headwin :: tail ⇒
                    if (headwin eq win) (acc ++ tail).toList
                    else helper(tail, acc += headwin)
            }
        }
        helper(list, ListBuffer())
    }

    def moveToTop(win : FSWindow) : Unit = {
        winStack = win :: removeFromList(win, winStack)
        val nwindows = winStack.length
        winStack.zipWithIndex.foreach {
            case (window, index) ⇒ window.setZIndex(nwindows - index + 5)
        }
    }

    type ResizerDirections = (Int, Int, Int, Int, String)

    final case class Resizer(window : FSWindow, dir : ResizerDirections, startX : Double, startY : Double) {
        protected val (dleft, dtop, dwidth, dheight, cursorType) = dir
        protected var lastX : Double = startX
        protected var lastY : Double = startY
        $("#mousecatcher").css("cursor", cursorType)

        def update(newX : Double, newY : Double) : Unit = {
            val dx = newX - lastX
            val dy = newY - lastY
            if ((dx != 0) || (dy != 0)) {
                val newLeft = dleft * dx
                val newTop = dtop * dy
                if ((newLeft != 0) || (newTop != 0)) {
                    window.adjustPosition(newLeft, newTop)
                }
                val newWidth = dwidth * dx
                val newHeight = dheight * dy
                if ((newWidth != 0) || (newHeight != 0)) {
                    window.adjustSize(newWidth, newHeight)
                }
                lastX = newX
                lastY = newY
            }
        }
    }

    private val resizeUpperLeft : ResizerDirections = (1, 1, -1, -1, "nwse-resize")
    private val resizeLowerLeft : ResizerDirections = (1, 0, -1, 1, "nesw-resize")
    private val resizeLeftMiddle : ResizerDirections = (1, 0, -1, 0, "ew-resize")
    private val resizeUpperRight : ResizerDirections = (0, 1, 1, -1, "nesw-resize")
    private val resizeLowerRight : ResizerDirections = (0, 0, 1, 1, "nwse-resize")
    private val resizeRightMiddle : ResizerDirections = (0, 0, 1, 0, "ew-resize")
    private val resizeUpperMiddle : ResizerDirections = (0, 1, 0, -1, "ns-resize")
    private val resizeLowerMiddle : ResizerDirections = (0, 0, 0, 1, "ns-resize")
    private val resizeActuallyMove : ResizerDirections = (1, 1, 0, 0, "move")

    private var lastCursorType = "foo"

}
