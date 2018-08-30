/**
  * Copyright © 2018 The Board of Trustees of The Leland Stanford Junior University.
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
  * Drop-down menu used in a MenuBar
  *
  * @author Howard Palmer
  */
package choice.fsdesktop

import org.scalajs.dom.html.Div
import org.scalajs.dom.raw.{Event, HTMLElement}
import scalatags.JsDom.all._

import scala.scalajs.js

class DropDownMenu(heading : String, menuId : Option[String]) {

    protected var userClickHandler : String ⇒ Unit = _

    protected val menu : Div = div(`class` := "menutop")(
        div(`class` := "menutitle")(heading),
        div(`class` := "menuarrow")(),
        ul(`class` := "menulist")()
    ).render

    menuId.foreach(menu.id = _)

    def get() : Div = menu

    def addItem(itemId : String, itemLabel : String) : DropDownMenu = {
        val item = li(id := itemId)(itemLabel).render
        menu.querySelector(".menulist").appendChild(item)
        this
    }

    def addItems(items : Seq[(String, String)]) : DropDownMenu = {
        val addTuple = (addItem _).tupled
        items foreach { pair ⇒ addTuple(pair) }
        this
    }

    def setHeading(heading : String) : DropDownMenu = {
        menu.querySelector(".menutitle").innerHTML = heading
        this
    }

    def enableItemClick(handler : String ⇒ Unit) : DropDownMenu = {
        userClickHandler = handler
        menu.querySelector(".menulist").addEventListener("click", clickHandler, useCapture = false)
        this
    }

    def disableItemClick() : DropDownMenu = {
        menu.querySelector(".menulist").removeEventListener("click", clickHandler, useCapture = false)
        userClickHandler = null
        this
    }

    protected def clickHandler(event : Event) : js.Any = {
        event.preventDefault()
        val target = event.target.asInstanceOf[HTMLElement]
        val itemId = target.id
        userClickHandler(itemId)
    }
}
