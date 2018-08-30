
// Turn this project into a Scala.js project by importing these settings

lazy val fsdesktop = (project in file("fsdesktop"))
    .settings(
        commonSettings,
        name := "fsdesktop",
        version := "0.1-SNAPSHOT"
    )
    .dependsOn(util)
    .enablePlugins(ScalaJSPlugin)

lazy val util = (project in file("util"))
    .settings(
        commonSettings,
        name := "util",
        version := "0.1-SNAPSHOT",
        scalaJSLinkerConfig ~= { _.withModuleKind(ModuleKind.CommonJSModule) }
    )
    .enablePlugins(ScalaJSPlugin)

lazy val commonSettings = Seq(
    scalaVersion := "2.12.6",

    scalacOptions ++= Seq("-deprecation", "-P:scalajs:sjsDefinedByDefault"),

    libraryDependencies ++= Seq(
        "org.scala-js" %%% "scalajs-dom" % "0.9.5",
        "com.lihaoyi" %%% "scalatags" % "0.6.3",
        "org.querki" %%% "jquery-facade" % "1.2"
    )

)