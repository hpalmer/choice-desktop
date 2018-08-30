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
 * Ace editor application for FSDesktop.
 *
 * @author Howard Palmer
 * Created by Hep on 3/24/2014.
 */
import 'jquery';
import 'ace/ace';
import 'ace/theme-twilight';
import 'ace/ext-modelist';
import 'ace/ext-settings_menu';
import Dialog from 'js/dialog';
import FSWinlib from 'js/fswinlib';
import FileOps from 'core/fileops';

function assert(condition) {
    if (!condition) {
        throw new Error('assert failed');
    }
}

const kbmodes = {
    emacs: 'ace/keyboard/emacs',
    vim: 'ace/keyboard/vim',
    ace: 'ace/keyboard/ace'
};

const mimetypeMap = {
    javascript: 'application/javascript',
    html: 'text/html',
    css: 'text/css',
    lua: 'text/x-lua'
};

const readyPromise = new Promise((resolve) => {
    ace.config.set('basePath', 'jspm_packages/github/ajaxorg/ace-builds@1.4.1');
    ace.require(['ace/ext/modelist', 'ace/theme/twilight', 'ace/ext/settings_menu'], (mlhandle, thhandle) => {
        $.session('onReady', (sinfo) => {
            resolve(mlhandle, thhandle, sinfo);
        });
    });
});

export default class FSEditor {
    constructor() {
        readyPromise.then((modelist, twilight, sinfo) => {
            this.FSWinlib = new FSWinlib();
            this.settings = {};
            this.changed = false;
            this.fileinfo = undefined;
            this.lmtime = undefined;
            this.filepath = undefined;
            this.currentDialog = undefined;
            this.modelist = modelist;
            this.mode = this.modelist.getModeForPath('any.txt');
            this.mimetype = this.getMimeType(this.mode.name);
            this.FSWinlib.onOpen().then(() => {
                this.closeRequested = false;
                this.FSWinlib.onClose().then(() => {
                    console.log('edit window is closing');
                    this.closeRequested = true;
                    this.disposeCurrentSession(() => {
                        if (!this.changed) {
                            this.FSWinlib.destroyWindow(this.FSWinlib.getWindowName());
                        }
                    })
                });
            });
            this.initializeDisplay();
            setTimeout(() => {
                this.setCanvasOnTop(false);
                this.editor = ace.edit('editor');
                this.editor.setTheme('ace/theme/twilight');
                this.editor.getSession().setMode(this.mode.mode);
                this.setEditorSize();
                this.editor.focus();
                kbmodes.aceBtn = this.editor.getKeyboardHandler();
                this.editor.on("change", (delta) => {
                    this.lmtime = Date.now();
                    this.changed = true;
                });
            }, 10);
            if (this.FSWinlib.getMasterName()) {
                this.receiveOptions();
            }
        });
    }

    setCanvasOnTop(b) {
        // If there is a current dialog, it will call back when it's done.
        if (!this.currentDialog) {
            const canvas = $(this.canvas.element);
            if (b) {
                canvas.css('background', '').parent().css('z-index', 10);
            }
            else {
                canvas.parent().css('z-index', 0);
            }
        }
    }

    setEditorSize() {
        console.log(`root height = ${this.root.height}`);
        $('#editor').css({
            height: `${this.centerPanel.height}px`,
            width: `${this.centerPanel.width}px`
        });
        this.editor.resize(true);
        this.editor.focus();
        console.log(`center dimensions: ${this.centerPanel.width} x ${this.centerPanel.height}`);
    }

    initializeDisplay() {
        const self = this;
        zebkit.require('ui', 'layout', (ui, layout) => {
            assert(self === this);
            this.canvas = new ui.zCanvas('mycanvas' /*, $(window).innerWidth() - 3, $(window).innerHeight() - 3*/);
            this.canvas.setSizeFull(true);
            $(window).on('resize', () => {
                this.canvas.setSizeFull(true);
                setTimeout(() => this.setEditorSize(), 20);
            });
            const boldFont = new zebkit.Font('Arial', 'bold', 16);
            this.root = this.canvas.root;
            this.root.properties({
                border: "plain",
                padding: 0,
                font: boldFont,
                background: 'rgba(0, 0, 0, 0)',
                layout: new layout.BorderLayout(0)
            });
            const menubar = new ui.Menubar([
                {
                    content: 'File',
                    sub: [
                        {
                            content: 'New',
                            sub: [
                                {
                                    content: 'Text',
                                    handler: () => self.fileAction('newtxtBtn')
                                },
                                {
                                    content: 'JavaScript',
                                    handler: () => self.fileAction('newjsBtn')
                                },
                                {
                                    content: 'HTML',
                                    handler: () => self.fileAction('newhtmlBtn')
                                },
                                {
                                    content: 'CSS',
                                    handler: () => self.fileAction('newcssBtn')
                                }
                            ]
                        },
                        {
                            content: 'Open...',
                            handler: () => self.fileAction('openBtn')
                        },
                        {
                            content: 'Save',
                            handler: () => self.fileAction('saveBtn')
                        },
                        {
                            content: 'Save As...',
                            handler: () => self.fileAction('saveAsBtn')
                        }
                    ]
                },
                {
                    content: 'Keyboard',
                    sub: [
                        {
                            content: 'Ace',
                            handler: () => self.selectKeyboard('ace')
                        },
                        {
                            content: 'Emacs',
                            handler: () => self.selectKeyboard('emacs')
                        },
                        {
                            content: 'Vim',
                            handler: () => self.selectKeyboard('vim')
                        }
                    ]
                }
            ]).extend([
                function $showSubMenu(menu) {
                    console.log('showing menu');
                    self.setCanvasOnTop(true);
                    this.$super(menu);
                },
                function select(index) {
                    console.log(`menu select ${index}`);
                    this.$super(index);
                    if (index < 0) {
                        self.setCanvasOnTop(false);
                    }
                }
            ]);
            menubar.setProperties({
                font: boldFont
            });
            ui.events.on('menuItemSelected', (e) => {
                console.log(`menu item selected: ${e.index}`);
            });
            const fbPanel = new ui.Panel(new layout.FlowLayout('left', 'center', 'horizontal', 10));
            fbPanel.setProperties({ background: 'green', border: 4 });
            fbPanel.add(menubar);
            menubar.isVisible = true;
            this.root.add('top', fbPanel);
            this.centerPanel = new ui.Panel().setProperties({
                background: 'rgba(0, 0, 0, 0)'
            });
            this.root.add('center', this.centerPanel);
            this.root.invalidate();
        });
    }

    receiveOptions() {
        const promise = this.FSWinlib.receive('options');
        this.FSWinlib.send(this.FSWinlib.getMasterName(), 'options', { status: 1 }, 'options');
        promise.then((options) => {
            this.options = options;
            console.log(this.FSWinlib.getWindowName() + ' received options');
            if (this.options.path) {
                this.open(this.options.path);
            }
        });
    }

    getMimeType(modename) {
        let mt = mimetypeMap[modename];
        if (mt === undefined) mt = 'text/plain';
        return mt;
    }

    fileAction(id) {
            // fmenu = $('#filemenu');
        console.log(id + ' selected');
        if (id === 'saveBtn') this.save();
        else if (id === 'saveAsBtn') this.saveAs();
        else if (id === 'openBtn') {
            this.disposeCurrentSession(() => {
                const options = {};
                options.op = 'getInputFile';
                options.filepath = this.lastFolder;
                this.browseForFile(options).then((result) => {
                    if (typeof result === 'string') {
                        this.open(result);
                    }
                });
            });
        }
        else {
            let modename;
            if (id === 'newtxtBtn') {
                modename = 'text';
            }
            else if (id === 'newjsBtn') {
                modename = 'javascript';
            }
            else if (id === 'newhtmlBtn') {
                modename = 'html';
            }
            else if (id === 'newcssBtn') {
                modename = 'css';
            }
            if (modename) {
                this.disposeCurrentSession(() => {
                    this.mode = this.modelist.modesByName[modename];
                    this.mimetype = mimetypeMap[this.mode.name];
                    this.editor.getSession().setMode(this.mode.mode);
                });
            }
        }
    }

    disposeCurrentSession(callback) {
        if (!this.changed) callback();
        else {
            const props = {
                title: 'Save Changes?',
                header: 'Save changes to current document?',
                body: 'You appear to have modified the current document but have not saved these changes.',
                buttons: [
                    {
                        content: 'Discard',
                        handler: () => this.saveDialogDiscard(callback)
                    },
                    {
                        content: (this.filepath === undefined) ? 'Save As...' : 'Save',
                        handler: () => this.saveDialogSave(callback)
                    }
                ]
            };
            this.setCanvasOnTop(true);
            this.currentDialog = new Dialog(props, this.root);
        }
    }

    saveDialogSave(callback) {
        this.currentDialog.close();
        this.currentDialog = undefined;
        this.setCanvasOnTop(false);
        this.saveLastFolder();
        this.save().then(() => callback());
    }

    saveDialogDiscard(callback) {
        this.currentDialog.close();
        this.currentDialog = undefined;
        this.setCanvasOnTop(false);
        this.saveLastFolder();
        const session = new ace.EditSession('');
        this.editor.setSession(session);
        this.editor.focus();
        this.changed = false;
        callback();
    }

    selectKeyboard(id) {
        console.log(id + ' selected');
        if (kbmodes[id]) {
            this.editor.setKeyboardHandler(kbmodes[id]);
        }
    }

    browseForFile(options, title) {
        return new Promise((resolve, reject) => {
            const browseInitialResponse = this.FSWinlib.receive("browse");
            const promise = this.FSWinlib.createWindow('filepicker.html?master=' + this.FSWinlib.getWindowName(), {
                modal: true,
                title: title || 'Select input file',
                closed: false
            });
            promise.then((msg) => {
                if (msg.status > 0) {
                    this.browseWindow = msg.window;
                    browseInitialResponse.then((bmsg) => {
                        if (bmsg.status > 0) {
                            const browseResult = this.FSWinlib.receive('browse');
                            this.FSWinlib.send(this.browseWindow, bmsg.rspPortId, options, 'browse');
                            browseResult.then((brmsg) => {
                                if (brmsg.status > 0) {
                                    resolve(brmsg.filepath);
                                }
                                else reject(brmsg);
                                this.FSWinlib.closeWindow(this.browseWindow);
                                this.FSWinlib.destroyWindow(this.browseWindow);
                            });
                        }
                    });
                }
            });
        });
    }

    saveLastFolder() {
        if (this.filepath) {
            const i = this.filepath.lastIndexOf('/');
            if (i >= 0) {
                this.lastFolder = (i === 0) ? '/' : this.filepath.substring(0, i);
            }
        }
    }

    open(path) {
        const jqxhr = FileOps.lookup({ path: path, exists: false });
        jqxhr.then((result) => {
            if (result.status != null) {
                if (result.status >= 1) {
                    this.fileinfo = result;
                    this.mimetype = result.mimetype;
                    const jqxhr = FileOps.get({path: path});
                    jqxhr.then((text) => {
                        this.filepath = path;
                        this.mode = this.modelist.getModeForPath(path);
                        if (this.mimetype === 'text/plain') {
                            // Not sure it should do this
                            this.mimetype = this.getMimeType(this.mode.name);
                        }
                        console.log(`${path}: mode ${this.mode.name}, MIME type ${this.mimetype}`);
                        const session = new ace.EditSession(text);
                        session.setMode(this.mode.mode);
                        this.editor.setSession(session);
                        this.editor.focus();
                    });
                }
                else if (result.status === 0) {
                    // New file
                    this.filepath = path;
                    this.mode = this.modelist.getModeForPath(this.filepath);
                    this.mimetype = this.getMimeType(this.mode.name);
                    const session = new ace.EditSession('');
                    session.setMode(this.mode.mode);
                    this.editor.setSession(session);
                    this.editor.focus();
                }
            }
        })
    }

    save() {
        if (this.filepath) {
            return new Promise((resolve, reject) => {
                this.checkExistingFile(this.filepath).then((lmtime) => {
                    const document = this.editor.getSession().getDocument(),
                        eol = document.getNewLineCharacter();
                    let lines = document.getAllLines();
                    lines = lines.map(function (line) {
                        return line + eol;
                    });
                    if (lines[lines.length - 1] === eol) lines.length -= 1;
                    console.log(`found ${lines.length} lines`);
                    const blob = new Blob(lines),
                        fd = new FormData(),
                        i = this.filepath.lastIndexOf('/');
                    let toname = this.filepath;
                    fd.append('op', 'load');
                    if (i >= 0) {
                        toname = this.filepath.substring(i + 1);
                        fd.append('todir', (i === 0) ? '/' : this.filepath.substring(0, i));
                        fd.append('toname', toname);
                    }
                    else fd.append('toname', this.filepath);
                    fd.append('mimetype', this.mimetype);
                    fd.append('replace', 'always');
                    fd.append('file', blob, toname);
                    $.ajax({
                        type: 'POST',
                        url: $.session('getContextRoot', '?api=file'),
                        data: fd,
                        processData: false,
                        contentType: false
                    }).then((data) => {
                        if (data.status > 0) {
                            this.changed = false;
                            this.lmtime = undefined;
                            this.fileinfo = data.result;
                            resolve();
                        }
                        else reject();
                        console.log(data);
                    }, reject);
                }, function () {
                    alert('File has not been saved.');
                    reject();
                });
            })
        }
        else {
            return this.saveAs();
        }
    }

    checkExistingFile(filepath) {
        return new Promise((resolve, reject) => {
            const jqxhr = FileOps.lookup({path: filepath, exists: false}, {context: this});
            jqxhr.then((object) => {
                if (object.status === 0) {
                    // File does not exist
                    resolve(undefined);
                }
                else if (object.status === 1) {
                    let ask;
                    if (!this.changed) {
                        if (!this.fileinfo) {
                            ask = "The file has been created somehow since you began editing\n" +
                                  "in this window. You do not appear to have any unsaved changes,\n" +
                                  "but if you continue, you will overwrite the new file.\n";
                        }
                        else if (this.fileinfo.mtime !== object.mtime) {
                            ask = "The file appears to have been updated since the last time\n" +
                                  "you accessed it. This window is showing no unsaved changes,\n" +
                                  "but if you previously saved changes, they may have been overwritten.\n" +
                                  "You may want to cancel this operation, save to a new filename,\n" +
                                  "and investigate the situation.\n"
                        }
                        else {
                            ask = "The file has not changed since you last accessed it, and you\n" +
                                  "have no unsaved changes. Continuing with this operation should\n" +
                                  "only update the last modified time of the file.\n"
                        }
                    }
                    else {
                        if (!this.fileinfo) {
                            ask = "The file has been created somehow since you began editing\n" +
                                  "in this window. If you continue this operation, that existing\n" +
                                  "file will be overwritten. You may want to cancel this operation,\n" +
                                  "save to a new filename, and investigate the situation.\n";
                        }
                        else if (this.fileinfo.mtime !== object.mtime) {
                            ask = "The file appears to have been updated since the last time\n" +
                                  "you accessed it. It is recommended that you cancel this operation\n" +
                                  "save to a new filename, and investigate the situation.\n";
                        }
                    }
                    if (ask) {
                        const props = {
                            title: 'WARNING! Replace newer file?',
                            header: 'WARNING! Replace newer file on server?',
                            body: ask,
                            buttons: [
                                {
                                    content: 'Cancel',
                                    handler: () => {
                                        this.currentDialog.close();
                                        this.currentDialog = undefined;
                                        this.setCanvasOnTop(false);
                                        reject();
                                    }
                                },
                                {
                                    content: 'Save',
                                    handler: () => {
                                        this.currentDialog.close();
                                        this.currentDialog = undefined;
                                        this.setCanvasOnTop(false);
                                        resolve(object.mtime);
                                    }
                                }
                            ]
                        };
                        this.setCanvasOnTop(true);
                        this.currentDialog = new Dialog(props, this.root);
                    }
                    else {
                        // Existing file is older
                        resolve(object.lmtime);
                    }
                }
                else {
                    alert('Error checking for existence of ' + filepath + ': ' + object.msg);
                    resolve(undefined);
                }
            });
        });
    }

    saveAs() {
        const options = {};
        options.op = 'getOutputFile';
        options.mimetype = this.mimetype;
        return this.browseForFile(options, 'Save to file').then((result) => {
            if (typeof result === 'string') {
                this.filepath = result;
                return this.save();
            }
            return Promise.reject();
        });
    }
}

let selectedKeyboard, modelist;
