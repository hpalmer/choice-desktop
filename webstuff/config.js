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

  map: {
    "ace": "github:ajaxorg/ace-builds@1.4.4",
    "babel": "npm:babel-core@5.8.38",
    "babel-runtime": "npm:babel-runtime@5.8.38",
    "components/jqueryui": "github:components/jqueryui@1.12.1",
    "core-js": "npm:core-js@1.2.7",
    "datatables.net": "npm:datatables.net@1.10.19",
    "datatables.net-dt": "npm:datatables.net-dt@1.10.19",
    "datatables.net-responsive": "npm:datatables.net-responsive@2.2.3",
    "datatables.net-responsive-dt": "npm:datatables.net-responsive-dt@2.2.3",
    "fschoice": "/fschoice/newlogging/scripts",
    "jquery": "npm:jquery@3.4.0",
    "jquery-easyui": "npm:jquery-easyui@1.5.21",
    "jquery-mousewheel": "npm:jquery-mousewheel@3.1.13",
    "jquery-ui": "github:components/jqueryui@1.12.1",
    "jquery.terminal": "npm:jquery.terminal@2.4.1",
    "newlogging": "/fschoice/newlogging/scripts",
    "github:components/jqueryui@1.12.1": {
      "jquery": "npm:jquery@3.4.0"
    },
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.4.1"
    },
    "github:jspm/nodelibs-buffer@0.1.1": {
      "buffer": "npm:buffer@5.2.1"
    },
    "github:jspm/nodelibs-os@0.1.0": {
      "os-browserify": "npm:os-browserify@0.1.2"
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
    "npm:@types/jquery@3.3.29": {
      "@types/sizzle": "npm:@types/sizzle@2.3.2"
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
    "npm:buffer@5.2.1": {
      "base64-js": "npm:base64-js@1.3.0",
      "ieee754": "npm:ieee754@1.1.13"
    },
    "npm:clipboard@2.0.4": {
      "good-listener": "npm:good-listener@1.2.2",
      "os": "github:jspm/nodelibs-os@0.1.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "select": "npm:select@1.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2",
      "tiny-emitter": "npm:tiny-emitter@2.1.0"
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
    "npm:datatables.net-dt@1.10.19": {
      "datatables.net": "npm:datatables.net@1.10.19",
      "jquery": "npm:jquery@3.4.0"
    },
    "npm:datatables.net-responsive-dt@2.2.3": {
      "datatables.net-dt": "npm:datatables.net-dt@1.10.19",
      "datatables.net-responsive": "npm:datatables.net-responsive@2.2.3",
      "jquery": "npm:jquery@3.4.0"
    },
    "npm:datatables.net-responsive@2.2.3": {
      "datatables.net": "npm:datatables.net@1.10.19",
      "jquery": "npm:jquery@3.4.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:datatables.net@1.10.19": {
      "jquery": "npm:jquery@3.4.0",
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
    "npm:jquery.terminal@2.4.1": {
      "@types/jquery": "npm:@types/jquery@3.3.29",
      "jquery": "npm:jquery@3.4.0",
      "prismjs": "npm:prismjs@1.16.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "wcwidth": "npm:wcwidth@1.0.1"
    },
    "npm:os-browserify@0.1.2": {
      "os": "github:jspm/nodelibs-os@0.1.0"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:prismjs@1.16.0": {
      "clipboard": "npm:clipboard@2.0.4"
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
