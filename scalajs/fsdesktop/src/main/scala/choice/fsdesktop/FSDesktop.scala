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
  * FSDesktop main.
  *
  * @author Howard Palmer
  */
package choice.fsdesktop

import org.scalajs.dom._
import org.scalajs.dom.raw.HTMLElement

import scala.concurrent.Future
import scala.scalajs.concurrent.JSExecutionContext.Implicits.queue
import scala.scalajs.js.annotation.{JSExport, JSExportTopLevel}
import scala.util.{Failure, Success, Try}

@JSExportTopLevel("FSDesktop")
object FSDesktop {

    protected var toolsMenu : DropDownMenu = _
    protected var rightMenu : DropDownMenu = _

    @JSExport
    def main() {
        val pageUrl : String = window.location.href
        val local = pageUrl startsWith "file:"
        println(s"main entered: local = $local")
        UserOps.getSession foreach { sessionInfo ⇒
            println("getSession done")
            initDesktop(sessionInfo)
            if (sessionInfo.isNotLoggedIn) Index.index()
            else Index.loginSuccess(sessionInfo.username, Some(sessionInfo.currentGroup))
        }
    }

    def initDesktop(sessionInfo : SessionInfo) : Unit = {
        println("initDesktop")
        FSWinlib.listen("winmgr")
        FSWinlib.receiveRequest("winmgr").foreach(handleWMgrRequest)
        val username = sessionInfo.username
        val isStanford_primary = sessionInfo.isMemberOf("/System/Users/Stanford_primary")
        val isTeacherAdmin = sessionInfo.isMemberOf("/schools/Admin")
        val menubar = new MenuBar(Some("menubar"))
        val toolsItems = List(
            ("browseBtn", "Browse"),
            ("editBtn", "Edit"),
            ("uploadBtn", "Upload"),
            ("termBtn", "Terminal"),
            ("playbackBtn", "Playback"),
            ("observerBtn", "Observer"),
            ("teacherBtn", "Teacher Tools")
        ) filter {
            case ("playbackBtn", _) ⇒ isStanford_primary
            case ("observerBtn", _) ⇒ isStanford_primary
            case ("teacherBtn", _) ⇒ isTeacherAdmin
            case _ ⇒ true
        }
        toolsMenu = new DropDownMenu("Tools", Some("mbarleft")).addItems(toolsItems)
        rightMenu = new DropDownMenu(username, Some("mbarright")).addItems(List(("logoutBtn", "Logout")))
        menubar.addClass("dthide").addMenu(toolsMenu).addMenu(rightMenu)
        val desktopElement = document.querySelector("#desktop")
        desktopElement.parentNode.insertBefore(menubar.get(), desktopElement)
        toolsMenu.enableItemClick(handleToolClick)
        rightMenu.enableItemClick(handleUserClick)
        refreshSession()
    }

    def setUsername(username : String) : Unit = {
        Try { rightMenu.setHeading(username) }
    }

    def showDesktop() : Unit = {
        val nodes = document.querySelectorAll("#desktop,#menubar")
        for (index ← Iterator.range(0, nodes.length)) {
            val element = nodes(index).asInstanceOf[HTMLElement]
            element.classList.remove("dthide")
            element.style.zIndex = ""
        }
    }

    private var _sessionRefresh : Int = -1

    def refreshSession() : Unit = {
        def simulateLogout() : Unit = {
            document.querySelector("#logoutBtn").asInstanceOf[HTMLElement].click()
        }
        _sessionRefresh = window.setInterval(() ⇒ {
            // If the getSession fails or the user appears logged out, pretend the logout
            // button was clicked.
            UserOps.getSession.onComplete {
                case Success(sessionInfo) ⇒
                    if (sessionInfo.isNotLoggedIn) {
                        simulateLogout()
                    }
                case Failure(thrown) ⇒
                    console.error(thrown.getMessage)
                    simulateLogout()
            }
        }, 15*60*1000)
    }

    def myChildUrl(path : String) : Some[String] = {
        val sep = if (path.contains("?")) "&" else "?"
        Some(s"$path${sep}master=${IfMessage.instance.getWindowName}")
    }

    def handleToolClick(id : String) : Unit = {
        val win = id match {
            case "browseBtn" ⇒
                // No master parameter for this one, because otherwise it expects the
                // master to tell it what to do.
                FSWindow(Some("filepicker.html"),
                         Some(WindowOptions.defaultOptions.copy(title = "Browse")))
            case "editBtn" ⇒
                FSWindow(myChildUrl("edit.html"),
                         Some(WindowOptions.defaultOptions.copy(title = "Edit", selfClosing = true)))
            case "termBtn" ⇒
                FSWindow(myChildUrl("terminal/index.html"),
                         Some(WindowOptions.defaultOptions.copy(width = 800,
                                                                height = 600,
                                                                title = "Choice Terminal")))
            case "uploadBtn" ⇒
                FSWindow(myChildUrl("upload.html"),
                         Some(WindowOptions.defaultOptions.copy(title = "Upload Files")))
            case "playbackBtn" ⇒
                FSWindow(myChildUrl("playback.html"),
                         Some(WindowOptions.defaultOptions.copy(title = "Playback Tool", width = 680, height = 400)))
            case "observeBtn" ⇒
                FSWindow(myChildUrl(UserOps.getContextRoot("observer/index.html")),
                         Some(WindowOptions.defaultOptions.copy(title = "Choicelet Observer")))
            case "teacherBtn" ⇒
                FSWindow(myChildUrl("teacher.html"),
                         Some(WindowOptions.defaultOptions.copy(title = "Manage Teacher Accounts",
                                                                width = 940,
                                                                height = 580)))
        }
        win.open()
    }

    def handleUserClick(id : String) : Unit = {
        id match {
            case "logoutBtn" ⇒
                window.clearInterval(_sessionRefresh)
                val future = UserOps.getSessionInfo flatMap { sessionInfo ⇒
                    sessionInfo.logintype match {
                        case "google" ⇒
                            val f = Index.googleSignOut()
                            f.map { _ ⇒
                                console.log("Completed Google sign-out.")
                                true
                            }.recover {
                                case _ ⇒
                                    console.error("Google sign-out failed.")
                                    false
                            }
                        case _ ⇒ Future.successful(true)
                    }
                }
                future.onComplete {
                    case Success(_ : Boolean) ⇒ UserOps.logout().done({ () ⇒ window.location.reload() })
                    case Failure(thrown) ⇒
                        console.error(s"logout error: ${thrown.getMessage}")
                }
        }
    }

    def getRequestWindow(request : WindowManagerRequest, window : String) : Option[FSWindow] = {
        FSWindow.getWindow(window) match {
            case some @ Some(_) ⇒ some
            case None ⇒
                println(s"unknown window $window referenced by message from ${request.origin}")
                FSWinlib.sendResponse(request, "msg", s"no such window: $window", -1)
                None
        }
    }

    def handleWMgrRequest(request : WindowManagerRequest) : Unit = {
        request match {
            case CreateWindow(origin, _, srcURL, options) ⇒
                val url = {
                    val delim = if (srcURL.lastIndexOf('?') < 0) "?" else "&"
                    s"$srcURL${delim}master=$origin"
                }
                val newwin = FSWindow(Some(url), Some(options))
                FSWinlib.sendResponse(request, "window", newwin.winName)
            case OnLoadWindow(_, _, window : String) ⇒
                getRequestWindow(request, window) foreach { fswindow ⇒
                    fswindow.onLoad.onComplete { _ ⇒
                        FSWinlib.sendResponse(request, "loaded", true)
                    }
                }
            case OnOpenWindow(_, _, window : String) ⇒
                getRequestWindow(request, window) foreach { fswindow ⇒
                    def openResponse() : Unit = {
                        FSWinlib.sendResponse(request, "open", true)
                    }
                    if (fswindow.isOpen) openResponse()
                    else fswindow.onOpen.onComplete { _ ⇒ openResponse() }
                }
            case OnCloseWindow(_, _, window : String) ⇒
                getRequestWindow(request, window) foreach { fswindow ⇒
                    fswindow.onClose.onComplete { _ ⇒
                        FSWinlib.sendResponse(request, "close", true)
                    }
                }
            case OpenWindow(_, _, window : String) ⇒
                getRequestWindow(request, window) foreach { fswindow ⇒
                    fswindow.show()
                    FSWinlib.sendResponse(request, "open", true)
                }
            case SetTitle(_, _, window : String, title) ⇒
                getRequestWindow(request, window) foreach { fswindow ⇒
                    fswindow.setTitle(title)
                }
            case CloseWindow(_, _, window : String) ⇒
                getRequestWindow(request, window) foreach { fswindow ⇒
                    fswindow.close()
                    FSWinlib.sendResponse(request, "closed", true)
                }
            case DestroyWindow(_, _, window : String) ⇒
                getRequestWindow(request, window) foreach { fswindow ⇒
                    fswindow.destroy()
                    FSWinlib.sendResponse(request, "destroyed", true)
                }
        }
        FSWinlib.receiveRequest("winmgr").foreach(handleWMgrRequest)
    }
}
