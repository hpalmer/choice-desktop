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
package choice.fsdesktop

import choice.util.QueryParams
import org.scalajs.dom
import org.scalajs.dom.html.IFrame
import org.scalajs.dom.{MessageEvent, window}

import scala.annotation.tailrec
import scala.collection.mutable
import scala.concurrent.{Future, Promise}
import scala.scalajs.js.Dynamic.global
import scala.scalajs.js.JSConverters._

/**
  * Comments from the original JavaScript version:
  *
  * Library for messaging between iframes based on postMessage(). The communicating
  * frames are assumed to be loaded from the same domain, so that there are no
  * cross-domain access issues.
  *
  * This is a revision of a library I developed to support a window manager for
  * a web page, where each window is represented by an iframe. But how an iframe
  * happens to be rendered is independent of the communication mechanism.
  *
  * Each iframe has a unique name, specified both as the "id" attribute of its <iframe>
  * element, and as a "window" query parameter in the "src" URL of the iframe. A "master"
  * query parameter may also be present, usually indicating the name of the iframe
  * responsible for creating this one.
  *
  * Messages sent between iframes contain the names of the source and destination
  * iframes, and also destination and response port ids, which are strings that
  * can be used to identify independent communication channels between iframes.
  *
  * JavaScript version created by Hep on 7/24/2014. Scala version on 7/19/2018.
  */
class IfMessage {
    import IfMessage._
    protected val waiters : mutable.Map[String, mutable.Queue[Promise[(IfMessageHdrJS, MessageEvent)]]] = mutable.Map()
    protected val queues : mutable.Map[String, mutable.Queue[MessageEvent]] = mutable.Map()
    protected val queryParams : QueryParams = QueryParams.extractFromWindow(dom.window)

    /**
      * The current window name.
      *
      * The first candidate for the window name is a query parameter, window, specifying the name
      * in the URL of the current page. Failing that, we look for a non-empty name property of the
      * current window, and failing that, assume we are the main window.
      */
    val windowName : String = {
        queryParams.getStringValue("window") match {
            case Some(qsWinName) ⇒ qsWinName
            case None ⇒
                Option(dom.window.name) match {
                    case None | Some("") ⇒ MAIN_WINDOW_NAME
                    case Some(domWinName) ⇒ domWinName
                }
        }
    }

    val masterName : Option[String] = queryParams.getStringValue("master")

    // Establish the event handler
    window.addEventListener("message", receiveEvent _, useCapture = false)

    /**
      * Get the name of the current iframe. The main frame is "winmain".
      * Other iframes are given names when they are created.
      *
      * @return window (iframe) name
      */
    def getWindowName : String = windowName

    /**
      * When a child window creates another child window, it may declare itself
      * to be the 'master' by including 'master' in the source URL for the new
      * window.
      *
      * @return the master window name, if present
      */
    def getMasterName : Option[String] = masterName

    /**
      * Get the window object for a specified iframe name. This assumes that
      * all iframes are children of the main frame.
      *
      * @param windowName the iframe name
      * @return
      */
    def getWindow(windowName : Option[String]) : Option[dom.Window] = {
        windowName match {
            case None ⇒ Option(window.top)
            case Some(name) if name == MAIN_WINDOW_NAME ⇒ Option(window.top)
            case Some(name) ⇒
                val iframeSelector = s"""iframe[name="$name"]"""
                // Look for an iframe window within the current top-level window.
                Option(window.top.document.querySelector(iframeSelector)) map { iframe ⇒
                    iframe.asInstanceOf[IFrame].contentWindow
                } match {
                    case found @ Some(_) ⇒ found
                    case None ⇒
                        // Legacy mechanism where the iframe is contained within a div which
                        // has the window name as its id.
                        Option(window.top.document.querySelector(s"#$name iframe")) match {
                            case Some(iframe) ⇒ Some(iframe.asInstanceOf[IFrame].contentWindow)
                            case None ⇒
                                // Follow the window.opener chain, looking for a window with the given name,
                                // or an iframe window within an opener window of that name.
                                @tailrec
                                def helper(openerOpt : Option[dom.Window]) : Option[dom.Window] = {
                                    openerOpt match {
                                        case Some(opener) ⇒
                                            if (opener.name == name) Some(opener)
                                            else {
                                                Option(window.document.querySelector(iframeSelector)) map {
                                                    _.asInstanceOf[IFrame].contentWindow
                                                } match {
                                                    case found @ Some(_) ⇒ found
                                                    case None ⇒ helper(Option(opener.opener))
                                                }
                                            }
                                        case None ⇒ None
                                    }
                                }
                                helper(Option(window.opener))
                        }
                }
        }
    }

    /**
      * Establish a message queue for a given port id. This is typically used when
      * messages may received on the port asynchronously, or from multiple sources.
      * The window manager uses this to ensure that it receives all requests sent
      * to it.
      *
      * If listen() is not called, there must be a receive() posted on a port
      * before a message for the port arrives. Otherwise the message is dropped.
      * With listen(), messages are queued in the order received, and can be
      * retrieved using receive() before or after a message arrives.
      *
      * @param portId portId the receiving port id
      */
    def listen(portId : String) : Unit = {
        queues get portId orElse {
            // Create a message queue for the port
            queues put (portId, mutable.Queue())
        }
    }

    /**
      * Acquire a promise for the receipt of a message on a specified port id. If
      * listen() has been called for the port id, and there are messages queued,
      * the returned promise will already be resolved. Otherwise it will be resolved
      * when a message for the port id arrives.
      *
      * If listen() is not called for the port id, receive() must be called before
      * a message arrives, or the message will be dropped. If multiple calls to
      * receive() for the same port id are made before a message arrives, all
      * return the same promise, which ultimately will be resolved with the same
      * message.
      *
      * @param portId  portId the receiving port id
      * @return a jQuery promise for the next received message
      */
    def receive(portId : String) : Future[(IfMessageHdrJS, MessageEvent)] = {
        val futureOpt = queues get portId match {
            case Some(queue) ⇒
                queue.dequeueFirst(_ ⇒ true) match {
                    case Some(msgEvent) ⇒
                        // Have a message
                        val msgData = msgEvent.data.asInstanceOf[IfMessageHdrJS]
                        waiters get portId match {
                            case Some(promiseQueue) ⇒
                                if (promiseQueue.isEmpty) Some(Future.successful((msgData, msgEvent)))
                                else None
                            case None ⇒ Some(Future.successful((msgData, msgEvent)))
                        }
                    case None ⇒ None
                }
            case None ⇒
                // No listen yet - maybe this should be an error
                None
        }
        futureOpt getOrElse {
            val promiseQueue = waiters getOrElse (portId, {
                val queue = mutable.Queue[Promise[(IfMessageHdrJS, MessageEvent)]]()
                waiters put (portId, queue)
                queue
            })
            val newPromise = Promise[(IfMessageHdrJS, MessageEvent)]()
            promiseQueue enqueue newPromise
            newPromise.future
        }
    }

    /**
      * Send a message to a given window and port id, with an optional response
      * port id. The dstWinName, dstPortId, srcWinName, and rspPortId (if present)
      * are added to the message before it is sent.
      *
      * @param dstWinName the destination window name
      * @param dstPortId the destination port id
      * @param message the message
      * @param rspPortId an optional response port id
      */
    def send(dstWinName : String, dstPortId : String, message : IfMessageHdrJS, rspPortId : Option[String]) : Unit = {
        message.dstWinName = dstWinName
        message.dstPortId = dstPortId
        message.srcWinName = getWindowName
        message.rspPortId = rspPortId.orUndefined
        getWindow(Option(dstWinName)) match {
            case Some(dstWindow) ⇒ dstWindow.postMessage(message, window.location.origin.get)
            case None ⇒
                global.console.warn(s"$getWindowName could not find destination window: $dstWinName")
        }
    }

    def sendError(dstWinName : String, dstPortId : String, msg : String, status : Int = -1) : Unit = {
        val argMsg = msg
        val argStatus = status
        val message : IfMessageHdrJS = new IfMessageHdrJS {
            var status : Int = argStatus
            var msg : String = argMsg
        }
        send(dstWinName, dstPortId, message, None)
    }

    /**
      * Handler for a message event.
      *
      * @param msgEvent a message event
      * @return false
      */
    def receiveEvent(msgEvent : MessageEvent) : Boolean = {
        val data = msgEvent.data.asInstanceOf[IfMessageHdrJS]
        data.dstPortId foreach { dstPortId ⇒
            println(s"$getWindowName received message from ${data.srcWinName}")
            // Anyone already waiting for this message?
            val delivered = waiters get dstPortId match {
                case Some(promiseQueue) ⇒
                    promiseQueue.dequeueFirst(_ ⇒ true) match {
                        case Some(promise) ⇒
                            // Yes, deliver the message
                            promise.success((data, msgEvent))
                            true
                        case None ⇒ false
                    }
                case None ⇒ false
            }
            if (!delivered) {
                queues get dstPortId match {
                    case Some(queue) ⇒ queue.enqueue(msgEvent)
                    case None ⇒
                        global.console.warn(s"$getWindowName dropped a message for port $dstPortId")
                }
            }
        }
        false
    }
}

object IfMessage {
    val MAIN_WINDOW_NAME = "winmain"

    lazy val instance : IfMessage = new IfMessage
}
