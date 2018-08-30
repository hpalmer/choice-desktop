System.config({
  defaultJSExtensions: true,
  transpiler: "babel",
  babelOptions: {
    "optional": [
      "runtime",
      "optimisation.modules.system"
    ]
  },
  paths: {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*",
    "terminal/*": "terminal/scripts/*"
  },
  bundles: {
    "terminal/term-bundle.js": [
      "terminal/term.js",
      "terminal/namedargument.js",
      "npm:babel-runtime@5.8.38/helpers/class-call-check.js",
      "npm:babel-runtime@5.8.38/helpers/create-class.js",
      "npm:babel-runtime@5.8.38/core-js/object/define-property.js",
      "npm:core-js@1.2.7/library/fn/object/define-property.js",
      "npm:core-js@1.2.7/library/modules/$.js",
      "terminal/quotedstring.js",
      "terminal/commandtable.js",
      "terminal/commandarg.js",
      "terminal/commanddef.js",
      "js/fswinlib.js",
      "core/ifmessage.js",
      "npm:jquery@3.3.1.js",
      "npm:jquery@3.3.1/dist/jquery.js",
      "core/table.js",
      "core/groups.js",
      "core/choice-session.js",
      "core/fileops.js",
      "core/jquery/jquery.tmpl.js",
      "npm:jquery.terminal@1.21.0.js",
      "npm:jquery.terminal@1.21.0/js/jquery.terminal.js",
      "github:jspm/nodelibs-process@0.1.2.js",
      "github:jspm/nodelibs-process@0.1.2/index.js",
      "npm:process@0.11.10.js",
      "npm:process@0.11.10/browser.js",
      "npm:wcwidth@1.0.1.js",
      "npm:wcwidth@1.0.1/index.js",
      "npm:wcwidth@1.0.1/combining.js",
      "npm:defaults@1.0.3.js",
      "npm:defaults@1.0.3/index.js",
      "npm:clone@1.0.4.js",
      "npm:clone@1.0.4/clone.js",
      "github:jspm/nodelibs-buffer@0.1.1.js",
      "github:jspm/nodelibs-buffer@0.1.1/index.js",
      "npm:buffer@5.2.0.js",
      "npm:buffer@5.2.0/index.js",
      "npm:ieee754@1.1.12.js",
      "npm:ieee754@1.1.12/index.js",
      "npm:base64-js@1.3.0.js",
      "npm:base64-js@1.3.0/index.js",
      "npm:babel-runtime@5.8.38/core-js/get-iterator.js",
      "npm:core-js@1.2.7/library/fn/get-iterator.js",
      "npm:core-js@1.2.7/library/modules/core.get-iterator.js",
      "npm:core-js@1.2.7/library/modules/$.core.js",
      "npm:core-js@1.2.7/library/modules/core.get-iterator-method.js",
      "npm:core-js@1.2.7/library/modules/$.iterators.js",
      "npm:core-js@1.2.7/library/modules/$.wks.js",
      "npm:core-js@1.2.7/library/modules/$.global.js",
      "npm:core-js@1.2.7/library/modules/$.uid.js",
      "npm:core-js@1.2.7/library/modules/$.shared.js",
      "npm:core-js@1.2.7/library/modules/$.classof.js",
      "npm:core-js@1.2.7/library/modules/$.cof.js",
      "npm:core-js@1.2.7/library/modules/$.an-object.js",
      "npm:core-js@1.2.7/library/modules/$.is-object.js",
      "npm:core-js@1.2.7/library/modules/es6.string.iterator.js",
      "npm:core-js@1.2.7/library/modules/$.iter-define.js",
      "npm:core-js@1.2.7/library/modules/$.set-to-string-tag.js",
      "npm:core-js@1.2.7/library/modules/$.has.js",
      "npm:core-js@1.2.7/library/modules/$.iter-create.js",
      "npm:core-js@1.2.7/library/modules/$.hide.js",
      "npm:core-js@1.2.7/library/modules/$.descriptors.js",
      "npm:core-js@1.2.7/library/modules/$.fails.js",
      "npm:core-js@1.2.7/library/modules/$.property-desc.js",
      "npm:core-js@1.2.7/library/modules/$.redefine.js",
      "npm:core-js@1.2.7/library/modules/$.export.js",
      "npm:core-js@1.2.7/library/modules/$.ctx.js",
      "npm:core-js@1.2.7/library/modules/$.a-function.js",
      "npm:core-js@1.2.7/library/modules/$.library.js",
      "npm:core-js@1.2.7/library/modules/$.string-at.js",
      "npm:core-js@1.2.7/library/modules/$.defined.js",
      "npm:core-js@1.2.7/library/modules/$.to-integer.js",
      "npm:core-js@1.2.7/library/modules/web.dom.iterable.js",
      "npm:core-js@1.2.7/library/modules/es6.array.iterator.js",
      "npm:core-js@1.2.7/library/modules/$.to-iobject.js",
      "npm:core-js@1.2.7/library/modules/$.iobject.js",
      "npm:core-js@1.2.7/library/modules/$.iter-step.js",
      "npm:core-js@1.2.7/library/modules/$.add-to-unscopables.js"
    ]
  },

  map: {
    "ace": "github:ajaxorg/ace-builds@1.4.1",
    "babel": "npm:babel-core@5.8.38",
    "babel-runtime": "npm:babel-runtime@5.8.38",
    "components/jqueryui": "github:components/jqueryui@1.12.1",
    "core-js": "npm:core-js@1.2.7",
    "datatables.net": "npm:datatables.net@1.10.16",
    "datatables.net-dt": "npm:datatables.net-dt@1.10.16",
    "datatables.net-responsive": "npm:datatables.net-responsive@2.2.0",
    "datatables.net-responsive-dt": "npm:datatables.net-responsive-dt@2.2.0",
    "fschoice": "/fschoice/newlogging/scripts",
    "jquery": "npm:jquery@3.3.1",
    "jquery-easyui": "npm:jquery-easyui@1.5.21",
    "jquery-mousewheel": "npm:jquery-mousewheel@3.1.13",
    "jquery-ui": "github:components/jqueryui@1.12.1",
    "jquery.terminal": "npm:jquery.terminal@1.21.0",
    "newlogging": "/fschoice/newlogging/scripts",
    "github:components/jqueryui@1.12.1": {
      "jquery": "npm:jquery@3.3.1"
    },
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.4.1"
    },
    "github:jspm/nodelibs-buffer@0.1.1": {
      "buffer": "npm:buffer@5.2.0"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.2": {
      "process": "npm:process@0.11.10"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "github:jspm/nodelibs-vm@0.1.0": {
      "vm-browserify": "npm:vm-browserify@0.0.4"
    },
    "npm:assert@1.4.1": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "buffer": "github:jspm/nodelibs-buffer@0.1.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "util": "npm:util@0.10.3"
    },
    "npm:babel-runtime@5.8.38": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:buffer@5.2.0": {
      "base64-js": "npm:base64-js@1.3.0",
      "ieee754": "npm:ieee754@1.1.12"
    },
    "npm:clipboard@2.0.1": {
      "good-listener": "npm:good-listener@1.2.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "select": "npm:select@1.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2",
      "tiny-emitter": "npm:tiny-emitter@2.0.2"
    },
    "npm:clone@1.0.4": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.1"
    },
    "npm:core-js@1.2.7": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:datatables.net-dt@1.10.16": {
      "datatables.net": "npm:datatables.net@1.10.16",
      "jquery": "npm:jquery@3.3.1"
    },
    "npm:datatables.net-responsive-dt@2.2.0": {
      "datatables.net-dt": "npm:datatables.net-dt@1.10.16",
      "datatables.net-responsive": "npm:datatables.net-responsive@2.2.0",
      "jquery": "npm:jquery@3.3.1"
    },
    "npm:datatables.net-responsive@2.2.0": {
      "datatables.net": "npm:datatables.net@1.10.16",
      "jquery": "npm:jquery@3.3.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:datatables.net@1.10.16": {
      "jquery": "npm:jquery@3.3.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:defaults@1.0.3": {
      "clone": "npm:clone@1.0.4"
    },
    "npm:good-listener@1.2.2": {
      "delegate": "npm:delegate@3.2.0"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:jquery-easyui@1.5.21": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:jquery-mousewheel@3.1.13": {
      "jquery": "npm:jquery@3.3.1"
    },
    "npm:jquery.terminal@1.21.0": {
      "jquery": "npm:jquery@3.3.1",
      "prismjs": "npm:prismjs@1.15.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "wcwidth": "npm:wcwidth@1.0.1"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:prismjs@1.15.0": {
      "clipboard": "npm:clipboard@2.0.1"
    },
    "npm:process@0.11.10": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:vm-browserify@0.0.4": {
      "indexof": "npm:indexof@0.0.1"
    },
    "npm:wcwidth@1.0.1": {
      "defaults": "npm:defaults@1.0.3"
    }
  }
});
