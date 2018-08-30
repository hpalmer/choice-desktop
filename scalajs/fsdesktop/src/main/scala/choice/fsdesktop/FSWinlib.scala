/**
  * Copyright © 2014-2018 The Board of Trustees of The Leland Stanford Junior University.
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
  *
  * @author Howard Palmer
  */
package choice.fsdesktop

/**
  * Window library for FSDesktop.
  *
  * JavaScript version reated by Hep on 3/24/2014. Scala version on 7/19/2018.
  */
import org.scalajs.dom.{MessageEvent, Window}

import scala.concurrent.{Future, Promise}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.scalajs.js
import scala.scalajs.js.UndefOr
import scala.util.{Failure, Success}
// import scala.scalajs.js.annotation.ScalaJSDefined

sealed trait WindowManagerRequest {
    val origin : String
    val responsePort : String
}

case class CreateWindow(origin : String, responsePort : String,
                        srcURL : String, options : WindowOptions) extends WindowManagerRequest

case class OpenWindow(origin : String, responsePort : String, window : String) extends WindowManagerRequest

case class SetTitle(origin : String, responsePort : String,
                    window : String, title : String) extends WindowManagerRequest

case class CloseWindow(origin : String, responsePort : String, window : String) extends WindowManagerRequest

case class DestroyWindow(origin : String, responsePort : String, window : String) extends WindowManagerRequest

case class OnLoadWindow(origin : String, responsePort : String, window : String) extends WindowManagerRequest

case class OnOpenWindow(origin : String, responsePort : String, window : String) extends WindowManagerRequest

case class OnCloseWindow(origin : String, responsePort : String, window : String) extends WindowManagerRequest


class FSWinlib(ifmessage : IfMessage) {
    protected var wmgrRequestId = 1
    protected val windowName : String = ifmessage.getWindowName
    protected val masterName : Option[String] = ifmessage.getMasterName

    def getWindowName : String = windowName

    def getMasterName : Option[String] = masterName

    def getWindow(winName : Option[String]) : Option[Window] = ifmessage.getWindow(winName)

    def listen(portId : String) : Unit = ifmessage.listen(portId)

    def receiveRequest(portId : String) : Future[WindowManagerRequest] = {
        val promise = Promise[WindowManagerRequest]()
        def nextMessage() : Unit = {
            ifmessage.receive(portId).onComplete {
                case Success((msg, _)) ⇒
                    val result = msg.srcWinName.flatMap(sw ⇒ msg.rspPortId map ((sw, _))).toOption match {
                        case Some((origin, responsePort)) ⇒
                            val wmgrReq = msg.asInstanceOf[FSWinMgrRequest]
                            wmgrReq.op match {
                                case "create" ⇒
                                    val options = wmgrReq.options.map(WindowOptions.fromJS)
                                        .getOrElse(WindowOptions.defaultOptions)
                                    Some(CreateWindow(origin, responsePort, wmgrReq.srcURL, options))
                                case "onload" ⇒
                                    Some(OnLoadWindow(origin, responsePort, wmgrReq.window))
                                case "onopen" ⇒
                                    Some(OnOpenWindow(origin, responsePort, wmgrReq.window))
                                case "onclose" ⇒
                                    Some(OnCloseWindow(origin, responsePort, wmgrReq.window))
                                case "open" ⇒
                                    Some(OpenWindow(origin, responsePort, wmgrReq.window))
                                case "setTitle" ⇒
                                    val title = wmgrReq.options.flatMap(_.title).getOrElse("")
                                    Some(SetTitle(origin, responsePort, wmgrReq.window, title))
                                case "close" ⇒
                                    Some(CloseWindow(origin, responsePort, wmgrReq.window))
                                case "destroy" ⇒
                                    Some(DestroyWindow(origin, responsePort, wmgrReq.window))
                                case _ ⇒ None
                            }
                        case None ⇒ None
                    }
                    result match {
                        case Some(req) ⇒ promise.success(req)
                        case None ⇒ nextMessage()
                    }
                case Failure(_) ⇒
                    nextMessage()
            }
        }
        nextMessage()
        promise.future
    }

    def send(dstWinName : String, dstPortId : String, message : FSWinMgrRequest, rspPortId : Option[String]) : Unit = {
        ifmessage.send(dstWinName, dstPortId, message, rspPortId)
    }

    def sendResponse(request : WindowManagerRequest, rspName : String, rspValue : js.Any, rspStatus : Int = 1) : Unit = {
        val response : IfMessageHdrJS = new IfMessageHdrJS {
            var status : Int = rspStatus
        }
        response.asInstanceOf[js.Dynamic].updateDynamic(rspName)(rspValue)
        ifmessage.send(request.origin, request.responsePort, response, None)
    }

//    def wmgrRequest(op : String, window : String, options : WindowOptions) : Future[(Any, MessageEvent)] = {
//        val rspPortId = s"wmgr$wmgrRequestId"
//        wmgrRequestId += 1
//        val result = receive(rspPortId)
//        result
//    }
//
//    def wmgrRequest(request : FSWinMgrRequest) : Future[(Any, MessageEvent)] = {
//        val rspPortId = s"wmgr${this.wmgrRequestId}"
//        val result = receive(rspPortId)
//        send(IfMessage.MAIN_WINDOW_NAME, "winmgr", request, Some(rspPortId))
//        result
//    }

//    def createWindow(srcURL : String, options : JSWindowOptions) : Future[(Any, MessageEvent)] = {
//        val finalSrcURL = {
//            if (srcURL.lastIndexOf('?') < 0) s"$srcURL?master=$getWindowName"
//            else if (srcURL.lastIndexOf("master=") < 0) s"$srcURL&master=$getWindowName"
//            else srcURL
//        }
//        val argOptions = options
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String =  "create"
//            override var srcURL : String = finalSrcURL
//            override var window : String = ""
//            override var options : UndefOr[JSWindowOptions] = argOptions
//        })
//    }
//
//    def openWindow(winName : String) : Future[(Any, MessageEvent)] = {
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String = "open"
//            override var window : String = winName
//            override var srcURL : String = _
//            override var options : UndefOr[JSWindowOptions] = js.undefined
//        })
//    }
//
//    def setTitle(winName : String, title : String) : Future[(Any, MessageEvent)] = {
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String = "setTitle"
//            override var window : String = winName
//            override var options : UndefOr[JSWindowOptions] = JSWindowOptions("title" → title)
//            override var srcURL : String = _
//        })
//    }
//
//    def closeWindow(winName : String) : Future[(Any, MessageEvent)] = {
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String = "close"
//            override var window : String = winName
//            override var options : UndefOr[JSWindowOptions] = js.undefined
//            override var srcURL : String = _
//        })
//    }
//
//    def destroyWindow(winName : String) : Future[(Any, MessageEvent)] = {
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String = "destroy"
//            override var window : String = winName
//            override var srcURL : String = _
//            override var options : UndefOr[JSWindowOptions] = js.undefined
//        })
//    }
//
//    def onLoad(winName : String) : Future[(Any, MessageEvent)] = {
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String = "onload"
//            override var window : String = winName
//            override var srcURL : String = _
//            override var options : UndefOr[JSWindowOptions] = js.undefined
//        })
//    }
//
//    def onOpen(winName : String) : Future[(Any, MessageEvent)] = {
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String = "onopen"
//            override var window : String = winName
//            override var srcURL : String = _
//            override var options : UndefOr[JSWindowOptions] = js.undefined
//        })
//    }
//
//    def onClose(winName : String) : Future[(Any, MessageEvent)] = {
//        wmgrRequest(new FSWinMgrRequest {
//            override var op : String = "onclose"
//            override var window : String = winName
//            override var srcURL : String = _
//            override var options : UndefOr[JSWindowOptions] = js.undefined
//        })
//    }
}

object FSWinlib extends FSWinlib(IfMessage.instance)

case class WindowOptions(
    title : String,
    width : Int,
    height : Int,
    top : Int,
    left : Int,
    modal : Boolean,
    closed : Boolean,
    selfClosing : Boolean,
    backgroundColor : String
)

object WindowOptions {
    implicit val defaultOptions : WindowOptions =
        WindowOptions("My Window", 600, 400, 100, 100, modal = false, closed = true, selfClosing = false, "burlywood")

    def fromJS(options : JSWindowOptions)(implicit defaults : WindowOptions) : WindowOptions = {
        val title = options.title.getOrElse(defaults.title)
        val width = options.width.getOrElse(defaults.width)
        val height = options.height.getOrElse(defaults.height)
        val top = options.top.getOrElse(defaults.top)
        val left = options.left.getOrElse(defaults.left)
        val modal = options.modal.getOrElse(defaults.modal)
        val closed = options.closed.getOrElse(defaults.closed)
        val selfClosing = options.selfClosing.getOrElse(defaults.selfClosing)
        val backgroundColor = options.backgroundColor.getOrElse(defaults.backgroundColor)
        WindowOptions(title, width, height, top, left, modal, closed, selfClosing, backgroundColor)
    }
}

