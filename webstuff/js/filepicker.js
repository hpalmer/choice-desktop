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
 * File browser application for FSDesktop.
 *
 * @author Howard Palmer
 * Created by Hep on 11/6/2014.
 */

import 'jquery';
import FSWinlib from 'js/fswinlib';
import FileOps from 'core/fileops';

const allFields = [
    { field: 'name', title: 'Name', hidden: false, sortable: true, align: 'left' },
    { field: 'size', title: 'Size', hidden: false, sortable: true, align: 'right' },
    { field: 'mimetype', title: 'Type', hidden: false, sortable: true, align: 'left' },
    { field: 'owner', title: 'Owner', hidden: true, sortable: true, align: 'left' },
    { field: 'crtime', title: 'Created', hidden: false, sortable: true, align: 'left',
      formatter: DateFormatter },
    { field: 'mtime', title: 'Modified', hidden: false, sortable: true, align: 'left',
      formatter: DateFormatter },
    { field: 'refcount', title: 'References', hidden: true, sortable: true, align: 'right' }
];

export default class FilePicker {
    constructor(sinfo) {
        if (FSWinlib === undefined) {
            console.warn('FSWinlib is undefined in FilePicker constructor');
        }
        else if (typeof FSWinlib !== 'function') {
            console.warn('FSWinlib is not a function in FilePicker constructor');
        }
        try {
            this.FSWinlib = new FSWinlib();
        }
        catch (ex) {
            console.error(ex);
        }
        this.log(`FilePicker started by ${this.FSWinlib.getMasterName()}`);
        this.username = sinfo.user.name;
        /**
         * History of folders visited
         * @type {Array}
         */
        this.pathHistory = [];
        /**
         * Current index in pathHistory
         * @type {number}
         */
        this.pathIndex = 0;
        /**
         * Option to select an output folder in slave mode.
         * @type {boolean}
         */
        this.getOutputFolder = false;
        /**
         * Option to select an input file in slave mode.
         * @type {boolean}
         */
        this.getInputFile = false;
        /**
         * Option to select an output file in slave mode.
         * @type {boolean}
         */
        this.getOutputFile = false;
        /**
         * A promise for the opening of this window.
         */
        this.openPromise = this.FSWinlib.onOpen();
        /**
         * A promise for the completion of GUI initialization
         * @type {*|{}}
         */
        this.displayReady = $.Deferred();
        /**
         * A promise for the list of files in the current folder.
         * @type {Promise}
         */
        this.filesPromise = Promise.resolve([]);
        /**
         * A flag indicating when setServerFolder is in progress.
         * @type {boolean}
         */
        this.settingFolder = false;
        this.lastClickTime = 0;
        /**
         * The file browser may be open as a standalone application, or as a helper
         * for another application. Check which it is.
         */
        if (this.FSWinlib.getMasterName()) {
            // This is slave mode, so the application which invoked us will be sending
            // information about what it wants.
            this.log('Filepicker slave mode');
            this.receiveOptions();
            this.explore = false;
        }
        else {
            // The file browser has been opened as a standalone application.
            this.log('Filepicker explore mode');
            this.explore = true;
            this.options = {op: 'explore'};
            // Get the initial folder for browsing
            this.getDefaultFolder();
            // Once the window has been opened, initialize the GUI
            this.openPromise.then(() => this.initDisplay());
        }
    }

    log(s) {
        const d = new Date();
        const ts = `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}.${d.getMilliseconds()}`;
        console.log(`${ts} - ${s}`);
    }

    /**
     * Receive options from the application which invoked the file browser for a specific purpose.
     *
     * @return {Promise} promise for options received and GUI initialized
     */
    receiveOptions() {
        this.log('receiveOptions called');
        // Set up to receive the options.
        const promise = this.FSWinlib.receive('options');
        // Tell the application we are ready to receive the options.
        this.FSWinlib.send(this.FSWinlib.getMasterName(), 'browse', {status: 1}, 'options');
        // Wait for the options to arrive.
        return promise.then((options) => {
            this.options = options;
            switch (this.options.op) {
                case 'getOutputFolder':
                    this.getOutputFolder = true;
                    break;
                case 'getInputFile':
                    this.getInputFile = true;
                    break;
                case 'getOutputFile':
                    this.getOutputFile = true;
                    break;
                default:
                    console.error(`unknown operation: ${this.options.op}`);
                    break;
            }
            this.log(`${this.FSWinlib.getWindowName()} received options`);
            // Is an initial folder included in the options?
            if (this.options.path) {
                this.lookupServerFolder(this.options.path);
            }
            else {
                // No, pick a default folder.
                this.getDefaultFolder();
            }
            return this.openPromise.then(() => this.initDisplay())
        });
    }

    /**
     * Initialize the GUI.
     */
    initDisplay() {
        this.log('initDisplay called');
        this.log(`window width = ${$(window).width()}`);
        this.log(`window innerWidth = ${$(window).innerWidth()}`);
        this.log(`window outerWidth = ${$(window).outerWidth()}`);
        zebkit.require('ui', 'layout', (ui, layout) => {
            this.canvas = new ui.zCanvas('mycanvas' /*, $(window).innerWidth() - 3, $(window).innerHeight() - 3*/);
            this.canvas.setSizeFull(true);
            $(window).on('resize', () => {
                this.canvas.setSizeFull(true);
            });
            this.root = this.canvas.root;
            this.root.properties({
                border: "plain",
                padding: 8,
                layout: new layout.BorderLayout(6)
            });
            const fbPanel = new ui.Panel(new zebkit.layout.FlowLayout('left', 'center', 'horizontal', 10));
            this.backButton = new ui.ArrowButton()
                .setDirection('left')
                .setBorder('plain')
                .setPadding(5);
            this.backButton.isEnabled = false;
            this.forwardButton = new ui.ArrowButton()
                .setDirection('right')
                .setBorder('plain')
                .setPadding(5);
            this.forwardButton.isEnabled = false;
            fbPanel.add(this.backButton);
            fbPanel.add(this.forwardButton);
            this.backButton.on(() => this.goBack());
            this.forwardButton.on(() => this.goForward());
            const topPanel = new ui.Panel(new layout.BorderLayout(10)).setBorder('plain').setPadding(5);
            topPanel.add('left', fbPanel);
            const self = this;
            this.pathCombo = new ui.Combo([], true);
            this.pathCombo.on('selected', function (combo, data) {
                const selectedPath = combo.getValue();
                console.log(`path selected as ${selectedPath} at ${data}`);
                combo.content.textField.clearSelection();
                self.setServerFolder(selectedPath);
            });
            this.pathCombo.content.textField.extend([
                function keyTyped(e) {
                    this.$super(e);
                    if (e.key === '\n') {
                        const path = this.getValue();
                        self.setServerFolder(path);
                    }
                }
            ]);
            topPanel.add('center', this.pathCombo);
            this.searchBox = new ui.TextField('', 10).setHint('Search');
            topPanel.add('right', this.searchBox);
            this.root.add('top', topPanel);
            const matrix = new zebkit.data.Matrix([]);
            this.grid = new ui.grid.Grid(matrix, 0, 5).setPadding(5).setBorder('plain');
            this.grid.isUsePsMetric = true;
            this.grid.on('selected', (grid, row, col, b) => {
                if (b) {
                    console.log('matrix row:', this.grid.model.getRow(row));
                    this.selectedRow = row;
                    this.handleSingleClick();
                }
                else {
                    this.selectedRow = -1;
                }
            });
            this.grid.extend([
                function pointerClicked(e) {
                    const now = Date.now();
                    const delta = now - self.lastClickTime;
                    if (delta < 280) {
                        this.pointerDoubleClicked(e);
                        self.lastClickTime = 0;
                    }
                    else {
                        console.log('click on grid');
                        self.lastClickTime = now;
                    }
                    this.$super(e);
                },
                function pointerDoubleClicked() {
                    console.log('grid pointerDoubleClicked');
                    if (self.selectedRow > 0) {
                        self.handleDblClick();
                    }
                }
            ]);
            const gridCaptions = new ui.grid.CompGridCaption([
                'Name', 'Size', 'Type', 'Created', 'Modified'
            ]);
            for (let i = 0; i < 5; ++i) {
                gridCaptions.setSortable(i, true);
            }
            this.grid.add('top', gridCaptions);
            this.grid.setViewProvider(new ui.grid.DefViews([
                function getXAlignment(grid, row, col) {
                    switch (col) {
                        case 1:
                            return 'right';
                        case 2:
                            return 'center';
                        default:
                            return 'left';
                    }
                },
                function getView(grid, row, col, val) {
                    switch (col) {
                        case 3:
                        case 4:
                            return new zebkit.draw.StringRender(DateFormatter(val));
                        default:
                            return new zebkit.draw.StringRender(val);
                    }
                }
            ]));
            const scrollPanel = new ui.ScrollPan(this.grid);
            const rightButtons = new ui.Panel(new layout.FlowLayout('left', 'center', 'horizontal', 10));
            if (this.explore) {
                // In standalone mode, there are more buttons
                this.buttonExit = new ui.Button('Exit');
                this.buttonExit.on(() => {
                    console.log('Exit button clicked.');
                    this.cancelButton();
                });
                this.buttonEdit = new ui.Button('Edit');
                this.buttonEdit.on(() => this.openButton());
                this.buttonDownload = new ui.Button('Download');
                this.buttonDownload.on(() => this.downloadButton());
                this.buttonDelete = new ui.Button('Delete');
                this.buttonDelete.on(() => this.deleteButton());
                rightButtons.add(this.buttonDelete);
                rightButtons.add(this.buttonDownload);
                rightButtons.add(this.buttonEdit);
                rightButtons.add(this.buttonExit);
            }
            else {
                // Slave mode
                this.buttonCancel = new ui.Button('Cancel');
                this.buttonCancel.on(() => this.cancelButton());
                this.buttonOpen = new ui.Button((this.getOutputFile) ? 'Save'
                                                                     : (this.getOutputFolder) ? 'Select' : 'Open');
                this.buttonOpen.on(() => this.openButton());
                rightButtons.add(this.buttonCancel);
                rightButtons.add(this.buttonOpen);
            }
            const bottomPanel = new ui.Panel(new layout.BorderLayout(10)).setBorder('plain').setPadding(10);
            const leftBottom = new ui.Panel(new layout.FlowLayout('left', 'left', 'horizontal'));
            this.filenameField = new ui.TextField('', 16);
            leftBottom.add(this.filenameField);
            bottomPanel.add('left', leftBottom);
            bottomPanel.add('center', new ui.Panel(new layout.FlowLayout()));
            bottomPanel.add('right', rightButtons);
            this.root.add('bottom', bottomPanel);
            this.root.add('center', scrollPanel);
            this.root.invalidate();
            this.displayReady.resolve();
            $('body').show();
        });
        return this.displayReady.promise();
    }

    updateComboBox(path) {
        const model = this.pathCombo.list.model;
        if (!model.contains(path)) {
            this.pathCombo.list.model.insert(0, path);
        }
    }

    updateHistory(path) {
        if (this.navButtonActive) {
            // This was instigated by one of the nav buttons, so don't update
            // the history. Just clear the flag that was set by the nav button.
            this.navButtonActive = false;
        }
        else if (this.pathHistory[this.pathIndex] !== path) {
            this.pathHistory.splice(this.pathIndex, 0, path);
            this.updateNavButtons();
        }
    }

    updateNavButtons() {
        setTimeout(() => {
            this.backButton.isEnabled = (this.pathIndex < (this.pathHistory.length-1));
            this.backButton.syncState();
            this.forwardButton.isEnabled = (this.pathIndex > 0);
            this.forwardButton.syncState();
            this.backButton.repaint();
            this.forwardButton.repaint();
        }, 100);
    }

    goBack() {
        if (this.pathIndex < (this.pathHistory.length-1)) {
            this.pathIndex += 1;
            this.navButtonActive = true;
            this.pathCombo.setValue(this.pathHistory[this.pathIndex]);
            this.updateNavButtons();
        }
    }

    goForward() {
        if (this.pathIndex > 0) {
            this.pathIndex -= 1;
            this.navButtonActive = true;
            this.pathCombo.setValue(this.pathHistory[this.pathIndex]);
            this.updateNavButtons();
        }
    }

    /**
     * Get the default server folder for this browse operation. This will be the home
     * folder of the current user, or failing that, the filesystem root.
     *
     * @return {Promise} promise for a lookup on the selected folder
     */
    getDefaultFolder() {
        this.log('getDefaultFolder called');
        // Try for the user home directory first
        return this.lookupServerFolder(`/home/${this.username}`).then(null, () => {
            return this.lookupServerFolder('/');
        });
    }

    /**
     * Given a path, check whether it is a folder on the server. Return a promise that succeeds
     * with the path if it is a folder. If the path is not a folder, trailing components of the
     * path are successively stripped off until a folder is found. If no folder is ever found,
     * the returned promise is rejected with the result of the last lookup.
     *
     * @param path a path on the server
     * @returns {*} a promise for the result
     */
    lookupServerFolder(path) {
        this.log('lookupServerFolder called');
        const helper = (hpath) => {
            return FileOps.lookup({path: hpath}).then((result) => {
                if (result.status && (result.status > 0) && (result.mimetype === 'choice/folder')) {
                    // Successful lookup
                    return this.displayReady.then(() => {
                        this.setCurrentFolder(result.path);
                        return this.serverFolder;
                    });
                }
                else if (hpath && (hpath !== '/')) {
                    // Unsuccessful lookup. Strip the last component of the path, if any,
                    // and try again.
                    const i = hpath.lastIndexOf('/');
                    hpath = (i > 0) ? hpath.substring(0, i) : '/';
                    return helper(hpath)
                }
                else throw new Error(`lookupServerFolder error: ${result}`);
            });
        };
        return helper(path);
    }

    setCurrentFolder(path) {
        const model = this.pathCombo.list.model;
        let itemIndex = model.indexOf(path);
        if (itemIndex < 0) {
            itemIndex = 0;
            this.pathCombo.list.model.insert(0, path);
        }
        this.pathCombo.list.select(itemIndex);
    }

    /**
     * Set the server folder. Initiate a server operation to list the files in the folder,
     * and show the files when the operation completes.
     *
     * @param path the server folder path
     * @returns {*} a promise for the server operation
     */
    setServerFolder(path) {
        this.log(`setServerFolder(${path}) called`);
        return this.filesPromise.then(() => {
            this.filesPromise = new Promise((resolve, reject) => {
                FileOps.ls({path: path}).then((result) => {
                    if (Array.isArray(result)) {
                        this.serverFolder = path;
                        this.displayReady.then(() => {
                            this.log('displayReady');
                            this.clearFilename();
                            this.updateComboBox(this.serverFolder);
                            this.updateHistory(this.serverFolder);
                            this.showFiles(result);
                            resolve(result);
                        });
                    }
                    else {
                        console.warn('file list failed:', result);
                        this.filesPromise = Promise.resolve(this.filteredFiles);
                        reject(result);
                    }
                });
            });
            return this.filesPromise;
        });
    }

    clearFilename() {
        this.filenameField.setValue('');
    }

    showFiles(files) {
        this.log('showFiles called');
        this.displayReady.then(() => {
            // Sort the file list (case-insensitive)
            const mapped = files.map(function (file, index) {
                return {index: index, value: file.name.toLowerCase()};
            });
            mapped.sort(function (a, b) {
                return +(a.value > b.value) || +(a.value === b.value) - 1;
            });
            files = mapped.map(function (el) {
                return files[el.index];
            });
            this.unfilteredFiles = files;
            this.filteredFiles = files;
            if (this.getOutputFolder) {
                this.filteredFiles = this.unfilteredFiles.filter(function (elem) {
                    return elem.mimetype === 'choice/folder';
                });
            }
            const search = this.searchBox.getValue();
            if (search) {
                this.filteredFiles = this.filteredFiles.filter(function(elem) {
                    return elem.name.indexOf(search) >= 0;
                });
            }
            if (this.explore) {
                this.FSWinlib.setTitle(this.FSWinlib.getWindowName(), 'Browse ' + this.serverFolder);
            }
            const fileMatrix = new zebkit.data.Matrix(this.filteredFiles.map(function (f) {
                return [f.name, f.size, f.mimetype, f.crtime, f.mtime];
            }));
            this.grid.setModel(fileMatrix);
            this.grid.invalidate();
            this.grid.topCaption.invalidate();
        });
    }

    makeFilePath(name, path) {
        if (name !== '.') {
            if (name === '..') {
                const i = path.lastIndexOf('/');
                if (i > 0) {
                    path = path.substring(0, i);
                }
                else path = '/';
            }
            else if (path === '/') {
                path = '/' + name;
            }
            else {
                path = path + '/' + name;
            }
        }
        return path;
    }

    handleSingleClick() {
        const file = this.getSelectedFile();
        if (file) {
            this.filename = file.name;
            this.filenameField.setValue(file.name);
        }
    }

    handleDblClick() {
        const file = this.getSelectedFile();
        if (file) {
            let path;
            // If file.mimetype is undefined, that means this user has very limited access
            // to the file. The only operation that might succeed is to assume it is a
            // folder, and try to list its contents. This can succeed if the file actually
            // is a folder to which the user has 'traverse' access. If it isn't a folder,
            // well, nothing else was going to work anyway.
            if ((file.mimetype === undefined) || (file.mimetype === 'choice/folder')) {
                const name = file.name;
                if (name !== '.') {
                    path = this.makeFilePath(name, this.serverFolder);
                    this.setCurrentFolder(path);
                }
                else if (this.getOutputFolder) {
                    this.open(name, file);
                }
            }
            else if (this.explore) {
                path = this.makeFilePath(file.name, this.serverFolder);
                switch (file.mimetype) {
                    case 'text/html':
                    case 'image/jpeg':
                    case 'image/png':
                        this.FSWinlib.createWindow($.session('getContextRoot', path + '?api=file&serve'), {
                            modal: false,
                            closed: false,
                            title: `File ${path}`
                        });
                        break;
                    default:
                        this.open(file.name, file);
                        break;
                }
            }
            else this.open(file.name, file);
        }
        return false;
    }

    getSelectedFile() {
        if (this.selectedRow >= 0) {
            const row = this.grid.model.getRow(this.selectedRow);
            const name = row[0];
            return this.filteredFiles.find(file => file.name === name);
        }
    }

    openButton() {
        const selectedFile = this.getSelectedFile();
        if (selectedFile) {
            const filename = selectedFile.name;
            if (filename) {
                this.open(filename, selectedFile);
            }
        }
        else if (this.getOutputFile) {
            // If we're getting an output file, there's a good chance it can't be selected.
            const name = this.filenameField.getValue();
            if (name) {
                this.open(name);
            }
        }
        else if (this.getOutputFolder) {
            // Nothing selected, so assume the current folder
            this.open('.', this.filteredFiles.find(f => f.name === '.'));
        }
    }

    open(filename, file) {
        if (filename) {
            const path = this.makeFilePath(filename, this.serverFolder);
            const plainFile = !(file && (file.special || file.container));
            const send = () => this.FSWinlib.send(this.options.srcWinName,
                                                  this.options.rspPortId, {status: 1, filepath: path});
            if (this.getOutputFile && plainFile) {
                send();
            }
            else if (this.getInputFile && plainFile) {
                send();
            }
            else if (this.getOutputFolder && file && (file.mimetype === 'choice/folder')) {
                send();
            }
            else if (this.explore && file && !file.special) {
                // In explore mode, if the file isn't special, open it in the editor
                const editInitialResponse = this.FSWinlib.receive('options');
                const promise = this.FSWinlib.createWindow("edit.html", {
                    modal: false,
                    closed: false,
                    selfClosing: true,
                    title: `Edit ${path}`
                });
                promise.then((msg) => {
                    if (msg.status > 0) {
                        this.editWindow = msg.window;
                        editInitialResponse.then((emsg) => {
                            if (emsg.status > 0) {
                                this.FSWinlib.send(this.editWindow, emsg.rspPortId, {
                                    path: path
                                }, 'edit');
                            }
                        });
                    }
                });
            }
            else {
                this.clearFilename();
            }
        }
    }

    cancelButton() {
        if (this.getOutputFile || this.getInputFile || this.getOutputFolder) {
            this.FSWinlib.send(this.options.srcWinName, this.options.rspPortId, {status: -1, msg: "user cancelled"});
        }
        this.FSWinlib.destroyWindow(this.FSWinlib.getWindowName());
    }

    deleteButton() {
        const file = this.getSelectedFile();
        if (file) {
            this.deleteCandidates = [file];
            const self = this;
            zebkit.require('ui', 'layout', (ui, layout) => {
                const popupPanel = new ui.Panel(new layout.BorderLayout(6));
                const boldFont = new zebkit.Font('Arial', 'bold', 16);
                popupPanel.add('top',
                    new zebkit.ui.Label('Permanently delete?')
                        .setPadding(20, 10, 10, 10)
                        .setFont(boldFont)
                );
                const centerStuff = new ui.Panel(new layout.FlowLayout('center', 'top', 'vertical', 8));
                centerStuff.add(new ui.Label(file.path).setPadding(5, 20, 10, 20));
                self.recursive = false;
                if (file.container) {
                    const checkbox = new ui.Checkbox('Recursive?');
                    centerStuff.add(checkbox);
                    checkbox.on(() => {
                        this.recursive = checkbox.getValue();
                    });
                }
                popupPanel.add('center', centerStuff);
                const rightButtons = new ui.Panel(new layout.FlowLayout('right', 'center', 'horizontal', 10));
                rightButtons.setRightPadding(20);
                const okButton = new ui.Button('Ok');
                okButton.on(() => this.deleteConfirmed());
                const nopeButton = new ui.Button('Cancel');
                nopeButton.on(() => self.deleteCancelled());
                rightButtons.add(nopeButton);
                rightButtons.add(okButton);
                popupPanel.add('bottom', rightButtons);
                const myWindow = new ui.Window('Confirm Delete', popupPanel);
                const winsize = myWindow.getPreferredSize();
                myWindow.setSize(winsize.width, winsize.height);
                ui.makeFullyVisible(self.root, myWindow);
                ui.showModalWindow(self.root, myWindow);
                console.log(winsize);
                self.deleteDialog = myWindow;
            });
        }
    }

    deleteConfirmed() {
        this.newpath = undefined;
        this.log(`delete confirmed ${this.recursive}`);
        this.deleteDialog.close();
        this.deleteIndex = 0;
        this.deleteNext();
    }

    deleteNext() {
        if (this.deleteIndex < this.deleteCandidates.length) {
            const file = this.deleteCandidates[this.deleteIndex++];
            if ((file.mimetype === 'choice/folder') && (this.serverFolder.lastIndexOf(file.path, 0) === 0)) {
                const j = file.path.lastIndexOf('/');
                if (j < 0) this.newpath = '/';
                else {
                    if (this.newpath) {
                        if (j < this.newpath.length) {
                            this.newpath = file.path.substring(0, j);
                        }
                    }
                    else this.newpath = file.path.substring(0, j);
                }
            }
            const promise = FileOps.rm({path: file.path, recursive: this.recursive}, {context: this});
            promise.then((result) => {
                if (result.status && (result.status > 0)) {
                    this.deleteNext();
                }
                else {
                    zebkit.require('ui', 'layout', (ui, layout) => {
                        const errorPanel = new ui.Panel(new layout.BorderLayout(10));
                        const boldFont = new zebkit.Font('Arial', 'bold', 16);
                        errorPanel.add('top',
                            new zebkit.ui.Label('Failed to delete:')
                                .setPadding(20, 10, 10, 10)
                                .setFont(boldFont)
                        );
                        const centerStuff = new ui.Panel(new layout.FlowLayout('center', 'top', 'vertical', 8));
                        centerStuff.add(new ui.Label(file.path).setPadding(5, 20, 10, 20));
                        const msg = this.getErrorMsg(result.msg);
                        centerStuff.add(new ui.Label(msg).setPadding(5, 20, 10, 20));
                        errorPanel.add('center', centerStuff);
                        const rightButtons = new ui.Panel(new layout.FlowLayout('right', 'center', 'horizontal', 10));
                        rightButtons.setRightPadding(20);
                        const okButton = new ui.Button('Ok');
                        const nopeButton = new ui.Button('Cancel');
                        rightButtons.add(nopeButton);
                        rightButtons.add(okButton);
                        errorPanel.add('bottom', rightButtons);
                        const myWindow = new ui.Window('Confirm Delete', errorPanel);
                        const winsize = myWindow.getPreferredSize();
                        myWindow.setSize(Math.min(winsize.width, this.root.width-10),
                                         Math.min(winsize.height, this.root.height-10));
                        ui.makeFullyVisible(this.root, myWindow);
                        ui.showModalWindow(this.root, myWindow);
                        okButton.on(() => {
                            myWindow.close();
                            this.deleteNext();
                        });
                        nopeButton.on(() => {
                            myWindow.close();
                            this.deleteCandidates = undefined;
                            this.deleteIndex = undefined;
                            this.setCurrentFolder(this.newpath || this.serverFolder);
                        });
                    });
                }
            });
            promise.fail(function (jqxhr, statusText) {
                alert(`Server operation failed: ${statusText}`);
            });
        }
        else {
            this.deleteCandidates = undefined;
            this.deleteIndex = undefined;
            this.setCurrentFolder(this.newpath || this.serverFolder);
        }
    }

    deleteCancelled() {
        this.log('delete cancelled');
        this.deleteDialog.close();
    }

    downloadButton() {
        const file = this.getSelectedFile();
        if (file) {
            const src = $.session('getContextRoot', `${file.path}?api=file`);
            $('body').append(`<iframe src="${src}" width="0" height="0" style="display:none;" />`);
        }
    }

    getErrorMsg(msg) {
        if (msg.startsWith('Failure(')) {
            msg = msg.substring(8, msg.length-1);
            while (msg.endsWith(',Empty')) {
                msg = msg.substring(0, msg.length-6);
            }
        }
        return msg;
    }
}

/**
 * Format a timestamp.
 *
 * @param value
 * @param row
 * @param index
 * @returns {string}
 * @constructor
 */
function DateFormatter(value, row, index) {
    const date = new Date(value);
    const ds = date.toDateString().substring(4);
    const ts = date.toLocaleTimeString();
    return `${ds} ${ts}`;
}

function two(n) {
    return (n < 10) ? '0' + n : n;
}
