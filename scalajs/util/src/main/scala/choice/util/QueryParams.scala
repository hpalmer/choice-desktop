package choice.util

import org.scalajs.dom.Window

import scala.annotation.tailrec
import scala.collection.mutable
import scala.scalajs.js.URIUtils.decodeURIComponent
import scala.scalajs.js.annotation.{JSExportAll, JSExportTopLevel}
import scala.util.control.Exception.allCatch

@JSExportAll
class QueryParams(queryParams : Map[String, Any]) {

    def get(key : String) : Option[Any] = queryParams get key

    def getOrElse(key : String, default : ⇒ Any) : Any = queryParams getOrElse (key, default)

    def getStringValue(key : String) : Option[String] = {
        get(key) match {
            case Some(s : String) ⇒ Some(s)
            case Some(q : mutable.Queue[_]) ⇒
                q.lastOption match {
                    case Some(s : String) ⇒ Some(s)
                    case _ ⇒ None
                }
            case _ ⇒ None
        }
    }

    def getStringValueOrElse(key : String, default : ⇒ String) : String = getStringValue(key) getOrElse default
}


object QueryParams {
    @JSExportTopLevel("extractFromWindow")
    def extractFromWindow(window : Window, useMap : mutable.Map[String, Any] = mutable.Map()) : QueryParams = {
        try {
            val s = Option(window.location.search) getOrElse ""
            if (s.nonEmpty) extractFromSearch(s, useMap) else new QueryParams(Map())
        }
        catch {
            case _ : Throwable ⇒ new QueryParams(Map())
        }
    }

    @JSExportTopLevel("extractFromWindowHierarchy")
    def extractFromWindowHierarchy(window : Window,
                                   useMap : mutable.Map[String, Any] = mutable.Map()) : QueryParams = {
        @tailrec
        def helper(curwin : Window, lastwin : Window) : Unit = {
            try {
                val search = curwin.location.search
                if (search.nonEmpty) extractFromSearch(search, useMap)
            }
            catch {
                case _ : Throwable ⇒ ()
            }
            if (curwin ne lastwin) helper(curwin.parent, curwin)
            else ()
        }
        helper(window, null)
        new QueryParams(useMap.toMap)
    }

    @JSExportTopLevel("extractFromURL")
    def extractFromURL(url : String, useMap : mutable.Map[String, Any] = mutable.Map()) : QueryParams = {
        val i = url.lastIndexOf('?')
        if (i >= 0) extractFromSearch(url.substring(i), useMap)
        else new QueryParams(Map())
    }

    @JSExportTopLevel("extractFromSearch")
    def extractFromSearch(search : String, useMap : mutable.Map[String, Any] = mutable.Map()) : QueryParams = {
        if (search.length > 1) extractFromPairs(search.substring(1).split('&'), useMap)
        else new QueryParams(Map())
    }

    @JSExportTopLevel("extractFromPairs")
    def extractFromPairs(nvpairs : Array[String], useMap : mutable.Map[String, Any] = mutable.Map()) : QueryParams = {
        nvpairs foreach { pair ⇒
            val nvpair = pair.split('=')
            val key = decodeURIComponent(nvpair(0))
            val vs = if (nvpair.length > 1) decodeURIComponent(Option(nvpair(1)).getOrElse("")) else ""
            val unquoted =
                if (vs.startsWith("\"") || vs.startsWith("'")) vs.substring(1, vs.length-1) else vs
            val decoded = unquoted match {
                case "true" ⇒ true
                case "false" ⇒ false
                case s if (allCatch opt s.toLong).isDefined ⇒ s.toLong
                case s if (allCatch opt s.toDouble).isDefined ⇒ s. toDouble
                case s ⇒ s
            }
            def qmapPut(qmap : mutable.Map[String, Any], key : String, value : Any) : Unit = {
                qmap put (key, qmap get key match {
                    case Some(queue : mutable.Queue[_]) ⇒ queue.asInstanceOf[mutable.Queue[Any]].enqueue(value)
                    case Some(oldval) ⇒ mutable.Queue(value, oldval)
                    case None ⇒ value
                })
            }
            qmapPut(useMap, key, decoded)
        }
        new QueryParams(useMap.toMap)
    }
}
