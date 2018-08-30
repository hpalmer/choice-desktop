package choice.fsdesktop

import scala.scalajs.js

// @ScalaJSDefined
trait JSWindowOptions extends js.Object {
    val title : js.UndefOr[String] = js.undefined
    val width : js.UndefOr[Int] = js.undefined
    val height : js.UndefOr[Int] = js.undefined
    val top : js.UndefOr[Int] = js.undefined
    val left : js.UndefOr[Int] = js.undefined
    val modal : js.UndefOr[Boolean] = js.undefined
    val closed : js.UndefOr[Boolean] = js.undefined
    val selfClosing : js.UndefOr[Boolean] = js.undefined
    val backgroundColor : js.UndefOr[String] = js.undefined
}

//object JSWindowOptions {
//    val fieldNames = Array(
//        "title",
//        "width",
//        "height",
//        "top",
//        "left",
//        "modal",
//        "closed",
//        "selfClosing",
//        "backgroundColor"
//    )
//
//    def apply(nvpairs : (String, js.Any)*) : JSWindowOptions = {
//        val options = new JSWindowOptions {}
//        val dynOptions = options.asInstanceOf[js.Dynamic]
//        nvpairs foreach {
//            case (field, value) if fieldNames.contains(field) ⇒
//                dynOptions.updateDynamic(field)(value)
//        }
//        options
//    }
//}

// @ScalaJSDefined
trait FSWinMgrRequest extends IfMessageHdrJS {
    var op : String
    var srcURL : String
    var window : String
    var options : js.UndefOr[JSWindowOptions]
}

trait IfMessageHdrJS extends js.Object {
    var dstWinName : js.UndefOr[String] = js.undefined
    var dstPortId : js.UndefOr[String] = js.undefined
    var srcWinName : js.UndefOr[String] = js.undefined
    var rspPortId : js.UndefOr[String] = js.undefined
}
