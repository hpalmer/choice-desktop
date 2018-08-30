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
  * Operations to the server User API.
  *
  * @author Howard Palmer
  */
package choice.fsdesktop

import scala.scalajs.js
import org.querki.jquery._

import js.Dynamic.{literal, global ⇒ g}
import scala.concurrent.{Future, Promise}
import scala.scalajs.js.{Dynamic, JSON, Object, UndefOr}
import scala.util.Try

case class SessionInfo(sessionId : Long, currentGroupId : Long, username : String,
                       logintype : String, home : Option[String], groups : Array[GroupInfo]) {
    def isMemberOf(group : String) : Boolean = {
        if (group.startsWith("/")) groups.exists(_.paths.contains(group))
        else groups.exists(_.paths.endsWith(s"/$group"))
    }

    def isLoggedIn : Boolean = !isNotLoggedIn

    def isNotLoggedIn : Boolean = logintype == "none"

    def currentGroup : String = {
        groups.find(_.gid == currentGroupId).map(_.paths(0)).getOrElse("*unknown group*")
    }
}

case class GroupInfo(gid : Long, name : String, desc : String, member : String, paths : Array[String])
case class LoginGroupInfo(desc : Option[String], login : Boolean, googleLoginEnabled : Boolean,
                          signup : Boolean, googleSignupEnabled : Boolean, captcha : Boolean,
                          verifyEmailEnabled : Boolean, regKeyEnabled : Boolean,
                          guest : Option[String], home : Option[String])

/**
 * Operations to the server User API.
 */
object UserOps {

    val userUrl : String = getContextRoot("?api=user")

    private var _sessionInfo : Option[SessionInfo] = None

    private var _loginGroupInfo : Option[LoginGroupInfo] = None

    def getSessionInfo : Future[SessionInfo] = {
        _sessionInfo match {
            case Some(sinfo) ⇒ Future.successful(sinfo)
            case None ⇒ getSession
        }
    }

    def getContextRoot(withSuffix : String) : String = {
        val suffix = if (withSuffix startsWith "/") withSuffix substring 1 else withSuffix
        val path = g.window.location.pathname.asInstanceOf[String]
        val i = path indexOf ('/', 1)
        s"${if (i > 0) path substring (0, i + 1) else "/"}$suffix"
    }

//    @js.native
//    class UserAjaxSettings(dataobj : js.Any) extends JQueryAjaxSettings {
//        `type` = "POST"
//        dataType = "json"
//        contentType = "application/json; charset=utf-8"
//        async = true
//        global = false
//        url = userUrl
//        data = js.JSON.stringify(dataobj)
//    }

    val defaultSettings : Object with Dynamic = literal("type" → "POST",
                                "dataType" → "json",
                                "contentType" → "application/json; charset=utf-8",
                                "async" → true,
                                "global" → false,
                                "url" → userUrl)

    def postJson(dataobj : js.Any) : JQueryXHR = {
        val settings = $.extend(literal(), defaultSettings, literal("data" → js.JSON.stringify(dataobj)))
        $.ajax(settings.asInstanceOf[JQueryAjaxSettings])
    }

    def getSession : Future[SessionInfo] = {
        val promise = Promise[SessionInfo]()
        val jqxhr = postJson(literal("op" → "getsession",  "page" → g.window.location.href.asInstanceOf[String]))
        jqxhr.done { result : js.Dynamic ⇒
            if (Try(result.status.asInstanceOf[Int] == 1).getOrElse(false)) {
                gotSession(result)
                _sessionInfo.foreach(promise.success)
            }
            else {
                promise.failure(new RuntimeException(s"getsession failed: ${result.msg}"))
            }
        }
        jqxhr.fail { _ : js.Any ⇒
            promise.failure(
                new RuntimeException(s"getsession POST operation failed: ${jqxhr.status} ${jqxhr.responseText}"))
        }
        promise.future
    }

    private def gotSession(result : js.Dynamic) {
        val sessionId = result.sessionid.asInstanceOf[Double].longValue()
        val currentGroupId = result.cgid.asInstanceOf[Double].longValue()
        val username = result.user.name.asInstanceOf[String]
        val logintype = result.logintype.asInstanceOf[UndefOr[String]]
        val home =
            if (js.typeOf(result.home) != "undefined") Some(result.home.asInstanceOf[String])
            else None
        val jsgarray = result.groups.asInstanceOf[js.Array[js.Dynamic]]
        val jsgroups = jsgarray map {
            gobj : js.Dynamic ⇒
                val gid = gobj.gid.asInstanceOf[Double].longValue()
                val name = gobj.name.asInstanceOf[String]
                val desc = gobj.desc.asInstanceOf[String]
                val member = gobj.member.asInstanceOf[String]
                val paths = gobj.paths.asInstanceOf[js.Array[String]].toArray
                GroupInfo(gid, name, desc, member, paths)
        }
        _sessionInfo = Some(SessionInfo(sessionId, currentGroupId, username, logintype.getOrElse(""),
                            home, jsgroups.toArray))
    }

    def getLoginGroupInfo : JQueryPromise = {
        val promise = postJson(literal("op" → "lginfo"))
        promise.done(gotLoginGroupInfo _)
    }

    def gotLoginGroupInfo(result : js.Dynamic) : Unit = {
        if (result.status.asInstanceOf[UndefOr[Int]] exists (_ > 0)) {
            val desc = result.desc.asInstanceOf[UndefOr[String]].toOption
            val login = result.login.asInstanceOf[UndefOr[Boolean]].toOption getOrElse false
            val googleLoginEnabled = result.googleLoginEnabled.asInstanceOf[UndefOr[Boolean]].toOption getOrElse false
            val signup = result.signup.asInstanceOf[UndefOr[Boolean]].toOption getOrElse false
            val googleSignupEnabled = result.googleSignupEnabled.asInstanceOf[UndefOr[Boolean]].toOption getOrElse false
            val captcha = result.captcha.asInstanceOf[UndefOr[Boolean]].toOption getOrElse false
            val verifyEmailEnabled = result.verifyEmailEnabled.asInstanceOf[UndefOr[Boolean]].toOption getOrElse false
            val regKeyEnabled = result.regKeyEnabled.asInstanceOf[UndefOr[Boolean]].toOption getOrElse false
            val guest = result.guest.asInstanceOf[UndefOr[String]].toOption
            val home = result.home.asInstanceOf[UndefOr[String]].toOption
            _loginGroupInfo = Some(LoginGroupInfo(desc, login, googleLoginEnabled, signup, googleSignupEnabled,
                                    captcha, verifyEmailEnabled, regKeyEnabled, guest, home))
        }
        else g.console.error(s"lginfo operation failed: ${result.toString}")
    }

    // Accessors for login group info
    def isLoginEnabled_? : Boolean = _loginGroupInfo.exists(_.login)
    def isGoogleLoginEnabled_? : Boolean = _loginGroupInfo.exists(_.googleLoginEnabled)
    def isSignupEnabled_? : Boolean = _loginGroupInfo.exists(_.signup)
    def isGoogleSignupEnabled_? : Boolean = _loginGroupInfo.exists(_.googleSignupEnabled)
    def isVerifyEmailEnabled_? : Boolean = _loginGroupInfo.exists(_.verifyEmailEnabled)
    def isCaptchaEnabled_? : Boolean = _loginGroupInfo.exists(_.captcha)
    def isRegKeyEnabled_? : Boolean = _loginGroupInfo.exists(_.regKeyEnabled)
    def getGuestPage : Option[String] = _loginGroupInfo.flatMap(_.guest)
    def getHomePage : Option[String] = _loginGroupInfo.flatMap(_.home)

    def login(username : String, password : String, group : Option[String]) : JQueryXHR = {
        val groupobj = (group fold literal()) (g ⇒ literal("group" → g))
        postJson($.extend(literal("op" → "login", "username" → username, "password" → password), groupobj))
    }

    def logout() : JQueryXHR = {
        postJson(literal("op" → "logout"))
    }

    def canRegister_?(group : Option[String], gid : Option[Long]) : JQueryXHR = {
        val groupobj = (group fold literal()) (g ⇒ literal("group" → g))
        val gidobj = (gid fold literal()) (g ⇒ literal("gid" → g))
        val req = $.extend(literal(), literal("op" → "register?"), groupobj, gidobj)
        println(s"calling postJson with ${JSON.stringify(req.asInstanceOf[js.Any])}")
        postJson(req.asInstanceOf[js.Any])
    }

    def initCaptcha(element : String) : JQueryDeferred = {
        val defobj = $.Deferred()
        $.getScript("https://www.google.com/recaptcha/api/js/recaptcha_ajax.js", { (_, _, _) ⇒
            val Recaptcha : js.Dynamic = g.Recaptcha
            val create : js.Function3[String, String, js.Any, js.Any] =
                Recaptcha.create.asInstanceOf[js.Function3[String, String, js.Any, js.Any]]
            create("6Lc1Ab8SAAAAAGhTW8i4LJunDVk5knDZgADtN2P-", element, literal(
                "theme" → "red",
                "callback" → ({ () ⇒ defobj.resolve() } : js.Function0[js.Any])
            ))
        })
        defobj
    }

    def validateUser(username : String, password : Option[String],
                     group : Option[String], gid : Option[Long]) : JQueryPromise = {
        val pwdobj = (password fold literal()) (p ⇒ literal("password" → p))
        val groupobj = (group fold literal()) (g ⇒ literal("group" → g))
        val gidobj = (gid fold literal()) (g ⇒ literal("gid" → g))
        val req = $.extend(literal(), literal("op" → "validate", "username" → username), pwdobj, groupobj, gidobj)
        postJson(req.asInstanceOf[js.Any])
    }


    def checkUsername(username : String) : JQueryPromise = {
        val defobj = $.Deferred()
        val (groupopt, uname) = {
            if (username == null) (None, null)
            else {
                val i = username lastIndexOf '/'
                if (i >= 0) (Some(username substring (0, i)), username substring (i + 1))
                else (None, username)
            }
        }
        uname match {
            case null ⇒
                defobj.reject("User id is missing.")
            case _ if uname.length < 3 ⇒
                defobj.reject("Your user id must be at least 3 characters long.")
//            case _ if uname.length > 32 ⇒
//                defobj.reject("Your user id is longer than 32 characters.")
            case _ ⇒
                validateUser(uname, None, groupopt, None).done({ result : js.Dynamic ⇒
                    val status = result.status.asInstanceOf[Double].intValue()
                    if (status == 0) defobj.resolve()
                    else if (status < 0) defobj.reject(s"Server says: ${result.msg}")
                    else defobj.reject("That user id is already taken.")
                })
        }
        defobj
    }

    private def optToLiteral(name : String, opt : Option[String]) : js.Object with js.Dynamic = {
        (opt fold literal()) (v ⇒ literal(name → v))
    }

    private def optToLiteralLong(name : String, opt : Option[Long]) : js.Object with js.Dynamic = {
        (opt fold literal()) (v ⇒ literal(name → v))
    }

    def checkStatus(result_object : js.Dynamic, status_missing : Boolean)(f : Int ⇒ Boolean) : Boolean = {
        val status_opt = result_object.status.asInstanceOf[UndefOr[Int]].toOption
        status_opt match {
            case Some(status) ⇒ f(status)
            case None ⇒ status_missing
        }
    }

    def register(username : String, password : Option[String],
                 group : Option[String], gid : Option[Long], email : Option[String],
                 regcode : Option[String], recaptcha_challenge : Option[String],
                 recaptcha_response : Option[String]) : JQueryPromise = {
        val parms = literal("op" → "register", "username" → username)
        val pwdobj = optToLiteral("password", password)
        val groupobj = optToLiteral("group", group)
        val gidobj = optToLiteralLong("gid", gid)
        val emailobj = optToLiteral("email", email)
        val rcodeobj = optToLiteral("regcode", regcode)
        val rccobj = optToLiteral("recaptcha_challenge_field", recaptcha_challenge)
        val rcrobj = optToLiteral("recaptcha_response_field", recaptcha_response)
        val defobj = $.Deferred()
        val req = $.extend(literal(), parms, pwdobj, groupobj, gidobj, emailobj, rcodeobj, rccobj, rcrobj)
        val promise = postJson(req.asInstanceOf[js.Any])
        promise.done({ result : js.Dynamic ⇒
            def captchaReload() {
                val Recaptcha : js.Dynamic = g.Recaptcha
                if (Recaptcha != null) {
                    val reload = Recaptcha.reload.asInstanceOf[js.Function0[Unit]]
                    reload()
                }
            }
            val valid = result.valid.asInstanceOf[Boolean]
            if (valid) {
                val status = result.status.asInstanceOf[Double].intValue()
                if (status == 0) {
                    defobj.resolve()
                }
                else {
                    val msg = result.msg.asInstanceOf[String]
                    defobj.reject(s"Registration failed. The server says: $msg")
                    captchaReload()
                }
            }
            else if (recaptcha_challenge.isDefined && !valid) {
                defobj.reject("Sorry, your answer to the challenge was not close enough. Here is another one to try.")
                captchaReload()
            }
            else if (checkStatus(result, status_missing = false)(_ < 0)) {
                val msg = result.msg.asInstanceOf[String]
                defobj.reject(s"Registration failed. The server says: $msg")
                captchaReload()
            }
            else {
                defobj.reject("bug")
            }
        })
        defobj
    }

    def isMemberOf(group : String) : Boolean = {
        _sessionInfo.exists(_.isMemberOf(group))
    }
}
