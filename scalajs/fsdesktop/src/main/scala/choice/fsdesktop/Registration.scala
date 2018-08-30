/**
  * Copyright © 2016 The Board of Trustees of The Leland Stanford Junior University.
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
  * FSDesktop user registration component.
  *
  * @author Howard Palmer
  * Created by Hep on 8/17/2016.
  */
package choice.fsdesktop

import org.querki.jquery._

import scala.scalajs.js
import scala.scalajs.js.Dynamic.{literal, global ⇒ g}
import scalatags.Text.TypedTag
import scalatags.Text.all._

/**
  */
object Registration {

    var regSequence : List[(String, JQuery ⇒ Unit)] = Nil
    var regPage : JQuery = _

    /**
      * Initiate registration.
      */
    def apply() : Unit = {
        $("body").append($(regForm.toString()))
        if (UserOps.isRegKeyEnabled_?) {
            setRegPage("regRegKey")(handleRegKey)
        }
        else if (UserOps.isVerifyEmailEnabled_?) {
            setRegPage("regEmail")(handleEmail)
        }
        else setRegPage("regUsername")(handleUsername)
    }

    // TODO: rewrite this
    def doRegister(evt : JQueryEventObject) : js.Any = {
        val form = $("#regform")
        val username = getOptionalVal($("#reguid", form))
        val (group, uname) = username match {
            case None ⇒ (None, null)
            case Some(userstring) ⇒
                val i = userstring lastIndexOf '/'
                if (i >= 0) (Some(userstring substring (0, i)), userstring substring (i + 1))
                else (None, userstring)
        }
        val pwd = getOptionalVal($("#regpwd", form))
        val pwd2 = getOptionalVal($("#regpwd2", form))
        val email = getOptionalVal($("#regemail", form))
        val regcode = getOptionalVal($("#regcode", form))
        val recaptcha_challenge =
            if (UserOps.isCaptchaEnabled_?) getOptionalVal($("[name=\"recaptcha_challenge_field\"]", form))
            else None
        val recaptcha_response =
            if (UserOps.isCaptchaEnabled_?) getOptionalVal($("[name=\"recaptcha_response_field\"]", form))
            else None
        if (pwd != pwd2) {
            $("#regpwd2_error").css("display","inline-block")
        }
        else {
            val promise = UserOps.register(uname, pwd, group, None, email, regcode,
                recaptcha_challenge, recaptcha_response)
            promise.done({ () ⇒
                $("#regform").hide()
                $("#userid").`val`($("#reguid").`val`().asInstanceOf[String])
                g.alert("Welcome! You are registered.")
                $("#pwd").focus()
            } : js.Function)
            promise.fail({ msg : String ⇒
                g.alert(msg)
                $("#recaptcha_response_field").focus()
            } : js.Function)
        }
        false
    }

    def regFormCancel() : Unit = {
        $("#regform").remove()
    }

    /**
      * Set the currently active registration page, including a handler for the input
      * item on the page. Each page has "Back" and "Next" buttons to navigate through
      * the registration sequence.
      *
      * @param pageId the id on the div containing the page to be activated
      * @param f a function to process the page input, which has the input element
      *          as an argument
      * @return a JQuery element for the page div
      */
    def setRegPage(pageId : String)(f : JQuery ⇒ Unit) : JQuery = {
        if (regPage != null) {
            regPage.hide()
        }
        val page = $(s"#$pageId")
        regPage = page
        page.show()
        val input = page.find("input").first().focus()
        $("#regNextButton").find("input").off().on("click", () ⇒ {
            // Save this page and handler for the "Back" processing
            regSequence = (pageId, f) :: regSequence
            f(input)
        })

        val backBtn = $("#regBackButton").find("input")
        backBtn.`val`(if (regSequence.isEmpty) "Cancel" else "Back")
        backBtn.off().on("click", () ⇒ {
            regSequence match {
                case Nil ⇒ regFormCancel()
                case (lastPage, lastHandler) :: tail ⇒
                    regSequence = tail
                    setRegPage(lastPage)(lastHandler)
            }
        })
        page
    }

    private def getOptionalVal(elem : JQuery) : Option[String] = {
        elem.`val`().asInstanceOf[String] match {
            case null ⇒ None
            case ss if ss == "" ⇒ None
            case ss ⇒ Some(ss)
        }
    }

    private def handleRegKey(input : JQuery) : Unit = {
        val regkey = input.`val`().asInstanceOf[String]
        println(s"The registration key is $regkey")
        UserOps.postJson(literal("op" → "regkey", "key" → regkey)).done((result : js.Dynamic) ⇒ {
            if (UserOps.checkStatus(result, status_missing = false)(_ == 1)) {
                if (UserOps.isVerifyEmailEnabled_?) {
                    setRegPage("regEmail")(handleEmail)
                }
                else setRegPage("regNothing")(_ ⇒ {})
            }
        })
    }

    private var emailAddress : String = _
    private var emailPromise : JQueryPromise = _
    private var codePromise : JQueryPromise = _

    private def handleEmail(input : JQuery) : Unit = {
        val email = input.`val`().asInstanceOf[String]
        emailAddress = email
        println(s"The email address is $email")
        $("#regstatus").html(s"<p>Sending a validation code to $email.</p>")
        emailPromise = UserOps.postJson(literal("op" → "emvsnd", "email" → email))
        setRegPage("regVcode")(handleValidationCode)
        emailPromise.done((result : js.Dynamic) ⇒ {
            $("#regstatus").html("<p>Email sent. Enter the code from the email when you receive it.</p>")
            if (UserOps.checkStatus(result, status_missing = false)(_ == 1)) {
                println(s"sent = ${result.sent.asInstanceOf[Boolean]}")
            }
            else {
                $("#regstatus").html(s"<p>Error sending email: ${result.msg.asInstanceOf[String]}.")
            }
        })
    }

    private def handleUsername(input : JQuery) : Unit = {
        val userstring = input.`val`().asInstanceOf[String]
        val (group, username) = {
            val i = userstring lastIndexOf '/'
            if (i >= 0) (Some(userstring substring(0, i)), userstring substring (i + 1))
            else (None, userstring)
        }
    }

    private def handleValidationCode(input : JQuery) : Unit = {
        setRegPage("regNothing")(_ ⇒ {})
        emailPromise.done((result : js.Dynamic) ⇒ {
            if (UserOps.checkStatus(result, status_missing = false)(_ == 1)) {
                val code = input.`val`()
                codePromise = UserOps.postJson(literal("op" → "emvchk", "email" → emailAddress, "code" → code))
                $("#regstatus").html(s"<p>Congratulations! Your email address, $emailAddress, is validated.</p>")
            }
            else {
                $("#regstatus").html(s"<p>The code you entered does not match the code that was sent.</p>")
            }
        })
    }

    /**
      * Define the HTML for the registration form. The form is organized like a wizard,
      * with "pages" for each input item. Which pages are presented depends on the settings
      * of the group in which the user is registering.
      *
      * @return the form as a ScalaTags entity
      */
    def regForm : TypedTag[String] = form(id := "regform", `class` := "popupform", action := "#")(
        fieldset(`class` := "loginbox")(
            legend(id := "formboxhdr")("New User Registration"),
            div(id := "reginputs")(
                // Page to read the registration key
                div(id := "regRegKey", `class` := "regpage")(
                    div(`class` := "reghelp")(
                        p("""This registration requires a registration key, which someone
                            |should have given you. Enter the registration key below, and
                            |click the Next button to continue. The registration key is not
                            |case-sensitive. If you don't have a registration key, click
                            |the Cancel button.
                          """.stripMargin)
                    ),
                    div()(
                        div(`class` := "loginrow")(
                            label(`class` := "flabel", `for` := "regInRegKey")("Registration Key:"),
                            input(id := "regInRegKey", `type` := "text", name := "regInRegKey")
                        )
                    )
                ),
                div(id := "regEmail", `class` := "regpage")(
                    div(`class` := "reghelp")(
                        p(
                            """Please specify an email address where we can send you a code,
                              |which will be required for the next step. Your email address
                              |may also be used as your username if you desire.
                            """.stripMargin)
                    ),
                    div()(
                        div(`class` := "loginrow")(
                            label(`class` := "flabel", `for` := "regInEmail")("Email Address:"),
                            input(id := "regInEmail", `type` := "text", name := "regInEmail")
                        )
                    )
                ),
                div(id := "regVcode", `class` := "regpage")(
                    div(`class` := "reghelp")(
                        p("""You should receive an email with a validation code shortly.""")
                    ),
                    div()(
                        div(`class` := "loginrow")(
                            label(`class` := "flabel", `for` := "regInVcode")("Validation Code:"),
                            input(id := "regInVcode", `type` := "text", name := "regInVcode")
                        )
                    )
                ),
                div(id := "regUsername", `class` := "regpage")(
                    div(`class` := "reghelp")(

                    ),
                    div()(
                        div(`class` := "loginrow")(
                            label(`class` := "flabel", `for` := "regInUsername")("Username"),
                            input(id := "regInUsername", `type` := "text", name := "regInUsername")
                        )
                    )
                ),
                div(id := "regNothing", `class` := "regpage")(
                    div(`class` := "reghelp")(
                        p("""Placeholder. Nothing here.""")
                    ),
                    div()(
                        div(`class` := "loginrow")(
                            label(`class` := "flabel", `for` := "regInNothing")("Nothing:"),
                            input(id := "regInNothing", `type` := "text", name := "regInNothing")
                        )
                    )
                )
            ),
            div(id := "regstatus", `class` := "reghelp")(),
            div(`class`:="loginrow", id:="regbuttons")(
                div(id:="regNextButton")(
                    input(`type`:="button", value:="Next")
                ),
                div(id:="regBackButton")(
                    input(`type`:="button", value:="Cancel")
                )
            )
        )
    )
}
