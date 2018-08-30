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
 * File upload application for FSDesktop.
 *
 * @author Howard Palmer
 * Created by Hep on 4/15/2014.
 */
define(['jquery', 'easyui/jquery.easyui.min',
        'fileupload/jquery.fileupload',
        'fileupload/jquery.fileupload-process',
        'core/fileops',
        'js/fswinlib'], function(jq, easyui, jqup, upproc, cfile, FSWinlib) {

    function Uploader() {
        this.FSWinlib = new FSWinlib();
        this.fileList = [];
        this.resultdiv = $('#result');
        this.initFileUpload();
        $('#browse').linkbutton().on('click', $.proxy(function() {
            var path = $('#todir').val();
            if (path == '') path = undefined;
            var promise = this.browseServer(path);
            promise.done(function(result) {
                $('#todir').val(result);
            });
        }, this));
        $('#replace').combobox();
        $('#add').linkbutton({
            iconCls: 'icon-add'
        }).on('click', function(e) {
            $('#fileupload').click();
        });
        $('#reset').linkbutton({ iconCls: 'icon-undo' }).on('click', $.proxy(this.onReset, this));
        $('#files').datagrid({
            fitColumns: true,
            striped: true,
            columns: [[
                { field: 'filename', title: 'Filename' },
                { field: 'size', title: 'Size' },
                { field: 'lmtimefmt', title: 'Last Modified' },
                { field: 'replace', title: 'Replace' },
                { field: 'unpack', title: 'Unpack', align: 'center',
                    editor: {
                        type: 'checkbox'
                    }
                },
                { field: 'cancel', title: 'Cancel' }
            ]]
        });
        $('#submit').linkbutton({ disabled: true });
    }

    Uploader.prototype.initFileUpload = function() {
        // Initialize the jQuery File Upload widget:
        $('#fileupload').fileupload({
            // Uncomment the following to send cross-domain cookies:
            //xhrFields: {withCredentials: true},
            url: $.session('getContextRoot', '?api=file'),
            autoUpload: false
        })
            .on('fileuploadadd', $.proxy(this.onAdd, this))
            .on('fileuploadsubmit', $.proxy(this.onSubmit, this))
            .on('fileuploadprogressall', $.proxy(this.onProgressAll, this))
            .on('fileuploaddone', $.proxy(this.onDone, this))
            .on('fileuploadfail', $.proxy(this.onFail, this));
    };

    Uploader.prototype.destroyFileUpload = function() {
        var input = $('#fileupload');
        input.fileupload('destroy');
        input.replaceWith(input.clone(false));
    };

    Uploader.prototype.replaceOption = function() {
        return $('#replace').combobox('getValue')
    };

    Uploader.prototype.unpackOption = function() {
        return $('#unpack').is(':checked')
    };

    Uploader.prototype.browseServer = function(startFolder) {
        var result = $.Deferred();
        var browseInitialResponse = this.FSWinlib.receive("browse");
        var options = {
            op: 'getOutputFolder',
            path: startFolder
        };
        var promise = this.FSWinlib.createWindow('filepicker.html?master=' + this.FSWinlib.getWindowName(), {
            modal: true,
            title: 'Select folder for upload',
            closed: false
        });
        promise.done($.proxy(function(msg) {
            if (msg.status > 0) {
                this.browseWindow = msg.window;
                browseInitialResponse.done($.proxy(function(bmsg) {
                    if (bmsg.status > 0) {
                        var browseResult = this.FSWinlib.receive("browse");
                        this.FSWinlib.send(this.browseWindow, bmsg.rspPortId, options, "browse");
                        browseResult.done($.proxy(function(brmsg) {
                            if (brmsg.status > 0) {
                                result.resolve(brmsg.filepath);
                            }
                            else result.fail(brmsg);
                            this.FSWinlib.closeWindow(this.browseWindow);
                            this.FSWinlib.destroyWindow(this.browseWindow);
                        }, this));
                    }
                }, this));
            }
        }, this));
        return result.promise();
    };

    Uploader.prototype.onAdd = function(e, data) {
        console.log('onAdd called with ' + data.files.length + ' files');
        var files = data.files;
        for (var i = 0; i < files.length; ++i) {
            var lmtime = files[i].lastModifiedDate,
                fileObject = {
                    file: files[i],
                    todir: $('#todir').val(),
                    filename: files[i].name,
                    size: files[i].size,
                    lmtime: lmtime.getTime(),
                    lmtimefmt: lmtime.toLocaleTimeString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZoneName: 'short'
                    }),
                    replace: this.replaceOption(),
                    unpack: this.unpackOption()
                };
            this.fileList.push(fileObject);
            $('#files').datagrid('appendRow', fileObject).datagrid('autoSizeColumn');
        }
        if (this.fileList.length == files.length) {
            $('#submit').linkbutton('enable')
                .on('click', $.proxy(this.sendFiles, this));
        }
    };

    Uploader.prototype.onReset = function(e) {
        $('#submit,#add').linkbutton('disable').off('click');
        this.destroyFileUpload();
        this.initFileUpload();
        this.resultdiv.empty();
        this.fileList = [];
        $('#files').datagrid('loadData', []);
        $('#add').linkbutton('enable').on('click', function(e) {
            $('#fileupload').click();
        });
    };

    Uploader.prototype.sendFiles = function(e) {
        $('#submit,#add').linkbutton('disable').off('click');
        this.send(0);
        e.stopPropagation();
        e.preventDefault();
        return false;
    };

    Uploader.prototype.send = function(i, p) {
        if (i >= this.fileList.length) {
            console.log('upload done');
            return;
        }
        if (p !== undefined) {
            p.always($.proxy(function() { this.send(i) }, this));
            return;
        }
        var fobj = this.fileList[i];
        var p = $('#fileupload').fileupload('option', 'formData', {
            op: 'load',
            todir: fobj.todir,
            unpack: fobj.unpack,
            replace: fobj.replace,
            lmtime: fobj.lmtime
        }).fileupload('send', { files: [ fobj.file ]});
        this.send(i + 1, p);
    };

    Uploader.prototype.onSubmit = function(e, data) {
        console.log('onSubmit called');
    };

    Uploader.prototype.onProgressAll = function(e, data) {
        console.log('onProgressAll called');
    };

    Uploader.prototype.onDone = function(e, data) {
        var result = data.result;
        console.log('upload status = ' + result.status);
        //$('#fileupload').fileupload('destroy');
        //this.resultdiv.empty();
        if (result.status < 1) {
            this.showError(result);
        }
        else {
            if ($.isArray(result.result)) {
                var files = result.result;
                var list = $('<ol></ol>').appendTo(this.resultdiv);
                for (var i = 0; i < files.length; ++i) {
                    var f = files[i];
                    var s = f.path + ' ' + f.mimetype + ' ' + f.size;
                    var repopt = ' - new';
                    if (f.replaced === true) {
                        repopt = ' - replaced';
                    }
                    else if (f.replaced === false) {
                        repopt = ' - NOT replaced';
                    }
                    list.append($('<li>' + s + repopt + '</li>'));
                }
            }
            else {
                f = result.result;
                var repopt = ' - new';
                if (f.replaced === true) {
                    repopt = ' - replaced';
                }
                else if (f.replaced === false) {
                    repopt = ' - NOT replaced';
                }
                this.resultdiv.append('<pre>' + f.path + ' ' + f.mimetype + ' ' +
                    f.size + repopt + '\n</pre>');
            }
        }
    };

    Uploader.prototype.onFail = function(e, data) {
        alert('upload failed', e);
    };

    Uploader.prototype.showError = function(result) {
        var msg = 'unknown error';
        if (result && result.msg) {
            msg = result.msg;
        }
        $('body').append($('<li style="color: red;">Error: ' + msg + '</li>'));
    };

    return Uploader;
});
