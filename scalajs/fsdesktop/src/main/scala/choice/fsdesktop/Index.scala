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
  * FSDesktop index page.
  *
  * @author Howard Palmer
  */
package choice.fsdesktop

import choice.util.QueryParams
import org.querki.jquery._
import org.scalajs.dom._
import scalatags.Text.TypedTag

import scala.language.implicitConversions

//import scala.scalajs.js.JSConverters._
import scalatags.Text.all._

import scala.concurrent.{Future, Promise}
import scala.scalajs.concurrent.JSExecutionContext.Implicits.queue
import scala.scalajs.js
import scala.scalajs.js.Dynamic.literal
import scala.scalajs.js.UndefOr
import scala.util.Try

/**
 * Index page.
 */
object Index {
    type JQEventHandler = js.Function1[JQueryEventObject, js.Any]

    val transitionEnd = "transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd"

    private val queryParams = QueryParams.extractFromWindowHierarchy(window)

    protected var _username : Option[String] = None
    protected var _group : Option[String] = None

    def loginForm : TypedTag[String] = {
        div(id:="loginpopup")(
            form(id:="loginform", `class` := "popupform", action:="user")(
                // Always include the member login, because an administrator can login
                // even when logins are disabled.
                fieldset(`class`:="loginbox")(
                    legend(`class`:="formboxhdr")("Member Login"),
                    input(`type`:="hidden", name:="op", value:="login"),
                    div(`class`:="loginrow")(
                        label(`class`:="flabel")("User Id:"),
                        input(id:="userid", `type`:="text", name:="userid", size:="18")
                    ),
                    div(`class`:="loginrow")(
                        label(`class`:="flabel")("Password:"),
                        input(id:="pwd", `type`:="password", name:="pwd", size:="18")
                    ),
                    div(`class`:="loginrow")(
                        input(id:="cancelbtn", `type`:="button", value:="Cancel"),
                        input(id:="logbutton", `type`:="submit", value:="Login")
                    )
                ),
                // Include the registration link if signup is enabled.
                if (UserOps.isSignupEnabled_?) {
                    fieldset(`class` := "loginbox", id := "reglinkbox")(
                        legend(`class` := "formboxhdr")("Create New Account"),
                        div(`class` := "loginrow")(a(id := "reglink", href := "#")("Sign Up!"))
                    )
                } else "",
                // Include the Google login button if that is enabled
                if (UserOps.isGoogleLoginEnabled_?) {
                    fieldset(`class` := "loginbox", id := "oauthbox")(
                        legend(`class` := "formboxhdr")("Use Other Account"),
                        div(`class` := "g-signin2", id := "gloginbtn")()
                    )
                } else ""
            )
        )
    }


    def index() {
        $("#bgimage").on(transitionEnd, null, null, addMap _)
            .removeClass("sizesmall")
    }

    def desktopLoaded(evt : JQueryEventObject) : js.Any = {
        println("desktopLoaded")
        $("#bgimage").remove()
    }

    def reglinkClicked(evt : JQueryEventObject) : js.Any = {
        println("reglink clicked")
        if (UserOps.isSignupEnabled_?) {
            Registration()
        }
        else window.alert("Sorry, registration is currently disabled.")
    }

    def loginSuccess(username : String, group : Option[String]) : Unit = {
        println("login success")
        _username = Some(username)
        _group = group
        _username.foreach(FSDesktop.setUsername)
        FSDesktop.showDesktop()
        $("#bgimage").addClass("sizelarge").on(transitionEnd, null, null, desktopLoaded _)
    }

    def addMap(evt : JQueryEventObject) : js.Any = {
        console.log("addMap called")
        if ($("#btnhere").length <= 0) {
            val lginfoPromise = UserOps.getLoginGroupInfo
            val mapNode = map(name:="mymap")(area(id:="btnhere",
                                                  attr("coords"):="520,520,585,565"),
                                                  attr("shape"):="rect")
            $("body").append($(mapNode.toString()))
            val btnhere = $("#btnhere")
            btnhere.on("click", () ⇒ mapButtonClick(btnhere, lginfoPromise))
            $("#bgimage").attr(js.Dictionary[String]("usemap" → "#mymap", "useMap" → "#mymap")).off(transitionEnd)
        }
        js.undefined
    }

    def mapButtonClick(btnhere : JQuery, lginfoPromise : JQueryPromise, popup : Option[JQuery] = None) : Boolean = {
        btnhere.off("click")
        println("map clicked")
        popup match {
            case None ⇒
                lginfoPromise.done(() ⇒ {
                    val popupForm = $(loginForm.toString())
                    $("#loginform", popupForm).on("submit", (evt : JQueryEventObject) ⇒ {
                        console.log("ignoring submit event on loginform")
                        evt.preventDefault()
                        evt.stopImmediatePropagation()
                        false
                    })
                    $("#cancelbtn", popupForm).on("click", () ⇒ {
                        console.log("cancel clicked on loginform")
                        popupForm.detach()
                        btnhere.on("click", () ⇒ mapButtonClick(btnhere, lginfoPromise, Some(popupForm)))
                        false
                    })
                    $("#logbutton", popupForm).on("click", (evt : JQueryEventObject) ⇒ {
                        console.log("login clicked on loginform")
                        loginClick(evt, btnhere, lginfoPromise, popupForm)
                    })
                    if (UserOps.isSignupEnabled_?) {
                        console.log("reglink clicked on loginform")
                        $("#reglink", popupForm).on("click", reglinkClicked _)
                    }
                    mapButtonClick(btnhere, lginfoPromise, Some(popupForm))
                })
            case Some(popupForm) ⇒
                val fsetup =
                    if (UserOps.isGoogleLoginEnabled_?) {
                        googleSignOut().andThen {
                            case _ ⇒
                                $("body").append(popupForm)
                                if (!googleButtonRendered) googleRenderButton()
                        }
                    }
                    else {
                        $("body").append(popupForm)
                        Future(true)
                    }
                fsetup.onComplete { _ ⇒ $("#userid").focus() }
        }
        false
    }

    def loginClick(evt : JQueryEventObject,
                   btnhere : JQuery, lginfoPromise : JQueryPromise, popup : JQuery) : Boolean = {
        evt.preventDefault()
        evt.stopImmediatePropagation()
        console.log("login button clicked")
        popup.detach()
        val form = $("#loginform", popup)
        val userid = $("#userid", form).`val`().asInstanceOf[String]
        val pwd = $("#pwd", form).`val`().asInstanceOf[String]
        val i = userid lastIndexOf '/'
        val (username, group) =
            if (i > 0) (userid substring (i + 1), Some(userid substring(0, i)))
            else (userid, None)
        UserOps.login(username, pwd, group).done((result : js.Dynamic) ⇒ {
            if (result.status.asInstanceOf[Double] > 0) {
                loginSuccess(username, group)
            }
            else {
                window.alert(s"Login failed: ${result.msg.asInstanceOf[String]}")
                val resetFuture =
                    if (UserOps.isGoogleLoginEnabled_?) googleSignOut()
                    else Future(true)
                resetFuture.onComplete { _ ⇒
                    $("#pwd", form).`val`("")
                    mapButtonClick(btnhere, lginfoPromise, Some(popup))
                }
            }
        })
        false
    }

    def getGoogleAPI : Option[js.Dynamic] = js.Dynamic.global.gapi.asInstanceOf[UndefOr[js.Dynamic]].toOption

    def googleLoadAuth2() : Future[js.Dynamic] = {
        getGoogleAPI map { gapi ⇒
            gapi.auth2.asInstanceOf[UndefOr[js.Dynamic]].toOption match {
                case Some(auth2) ⇒ Future(auth2)
                case None ⇒
                    val p = Promise[js.Dynamic]()
                    val f = p.future
                    console.warn("loading Google auth2...")
                    gapi.load("auth2", () ⇒ {
                        val initPromise = gapi.auth2.init()
                        initPromise.`then`(() ⇒ p.complete(Try(gapi.auth2)))
                    })
                    f
            }
        } getOrElse Future.failed(new RuntimeException("Google API not available"))
    }

    def googleSignOut() : Future[js.Dynamic] = {
        getGoogleAPI map { gapi ⇒
            googleLoadAuth2().andThen {
                case _ ⇒
                    val auth2 = gapi.auth2.getAuthInstance()
                    val signOutPromise =
                        if (auth2.isSignedIn.get.asInstanceOf[Boolean]) auth2.signOut().asInstanceOf[js.Promise[js.Dynamic]]
                        else js.Promise.resolve[js.Dynamic](auth2)
                    signOutPromise.toFuture
            }
        } getOrElse Future.failed(new RuntimeException("Google API not available"))
    }

    private var googleButtonRendered = false

    def googleRenderButton() : Future[Dynamic] = {
        val f = googleSignOut()
        f.andThen {
            case _ ⇒
                getGoogleAPI foreach { gapi ⇒
                    if (!googleButtonRendered) {
                        googleButtonRendered = true
                        gapi.signin2.render("gloginbtn", literal(
                            "scope" → "profile email",
                            "redirecturi" → "postmessage",
                            "onsuccess" → googleLoginSuccess _,
                            "onfailure" → googleLoginFailure _,
                            "theme" → "dark",
                            "width" → 240,
                            "height" → 50,
                            "longtitle" → true
                        ))
                    }
                    else console.error("tried to render Google button again")
                }
        }
    }

    def googleLoginSuccess(googleUser : js.Dynamic) : Unit = {
        val profile = googleUser.getBasicProfile()
        val id_token = googleUser.getAuthResponse().id_token
        console.log(s"ID: ${profile.getId()}")   // Do not send to your backend! Use an ID token instead.
        console.log(s"Name: ${profile.getName()}")
        console.log(s"Image URL: ${profile.getImageUrl()}")
        console.log(s"Email: ${profile.getEmail()}")
        console.log(s"Send Auth ID: $id_token")
        val form = $("#loginform").hide()
        val gloginOp = literal(
            "op" → "glogin",
            "token_id" → id_token
        )
        val userPassLit = {
            val userid = $("#userid", form).`val`().asInstanceOf[String]
            if (userid.length > 0) {
                val pwd = $("#pwd", form).`val`().asInstanceOf[String]
                literal("username" → userid, "password" → pwd)
            }
            else literal()
        }
        val groupOpt = queryParams.getStringValue("group")
        val groupLit = groupOpt.map(g ⇒ literal("group" → g)).getOrElse(literal())
        UserOps.postJson($.extend(gloginOp, userPassLit, groupLit)).done((result : js.Dynamic) ⇒ {
            val resultStatus = result.status.asInstanceOf[js.UndefOr[Int]].toOption.getOrElse(-1)
            if (resultStatus > 0) {
                console.log("glogin succeeded.")
                loginSuccess(profile.getEmail().asInstanceOf[String], groupOpt)
            }
            else {
                console.error(s"glogin failed: ${result.msg}")
                googleSignOut().onComplete { _ ⇒
                    form.show()
                    $("#pwd").`val`("")
                    $("#userid").`val`("").focus()
                }
                window.alert(s"Login failed: ${result.msg.asInstanceOf[String]}")
            }
        }).fail((err : js.Dynamic) ⇒ {
            googleSignOut().onComplete { _ ⇒ window.alert(s"glogin operation failed: $err") }
        })
    }

    def googleLoginFailure() : Unit = {
        console.error("Google sign-in failed.")
    }
}
