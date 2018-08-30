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
 * Command-line terminal application for FSDesktop.
 *
 * @author Howard Palmer
 * Created by Hep on 4/13/2014.
 */
import $ from 'jquery';
import terminalExports from 'jquery.terminal';
import 'core/jquery/jquery.tmpl';
import 'core/choice-session';
import 'core/fileops';
import 'core/groups';
import 'core/table';
import FSWinlib from 'js/fswinlib';

// define(['jqplugin/jquery.tmpl',
//         'jqterm', 'core/choice-session', 'core/table', 'core/groups', 'core/fileops',
//         'fsdesktop/fswinlib'], function(jqtmpl, jqterm, chses, ctab, cgrp, cfile, FSWinlib) {

class CommandArg {
    /**
     *
     * @param name
     * @param parser
     * @param noise
     * @param options
     * @constructor
     */
    constructor(name, parser, noise, options) {
        this.name = name;
        this.parser = parser;
        this.noise = noise;
        this.options = [];
        for (let i = 3; i < arguments.length; ++i) this.options[this.options.length] = arguments[i];
    }

    isFile() {
        return this.options.indexOf('file') >= 0;
    }

    isContainer() {
        return this.options.indexOf('container') >= 0;
    }

    isOptional() {
        return this.options.indexOf('optional') >= 0;
    }
}

class CommandDef {
    constructor(command, help, argdefs, func) {
        this.command = command;
        this.help = help;
        this.argdefs = argdefs;
        this.func = func;
    }
}

class QuotedString {
    constructor(s, quoteChar) {
        this.s = s;
        this.quote = quoteChar;
    }

    isEmpty() {
        return (this.s == null) || (this.s.length === 0);
    }

    toString() {
        return this.s;
    }
}

class NamedArgument {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    getName() {
        return this.name;
    }

    getValue() {
        return this.value;
    }

    toString() {
        return this.value.toString();
    }
}

class CommandLineInterpreter {
    constructor() {
        this.FSWinlib = new FSWinlib();
        terminalExports(window, $);
        this.utableId = 0;
        this.cwd = '/';
        this.dirstack = [];
        this.initCommands();
        this.termdiv = $('#term');
        this.termPrompt = location.hostname.split('.')[0] + '> ';
        this.myterm = this.termdiv.terminal($.proxy(function (command, term) {
            this.myterm = term;
            this.parseCommand(command);
        }, this), {
            greetings: "Welcome to Choice Project Administration",
            prompt: this.termPrompt,
            clear: false,
            exit: false,
            convertLinks: false,
            title: "Choice Project Administration",
            onExit: $.proxy(this.exit, this),
            keydown: $.proxy(this.keyHandler, this),
            keypress: $.proxy(this.pager, this),
            completion: $.proxy(this.completion, this)
        });
        // This is a nasty hack to keep TAB from tabbing to the close box on the dialog
        this.termdiv.on('keydown.gmgt', $.proxy(function (e) {
            if (e.which === 9) {
                // Forward the event to where the terminal cmd plugin is listening
                $(document.documentElement || window).trigger(e);
                // And stop it from propagating further
                e.stopPropagation();
            }
        }, this));
    }



    keyHandler(event, term) {
        // Map Ctrl-space to TAB
        if (event.which === 32 && event.ctrlKey) {
            event.which = 9; // TAB
            event.ctrlKey = false;
        }
    }


    pager(event, term) {
        if (this.pagingFunction !== undefined) {
            return this.pagingFunction(event, term);
        }
    }


    findCommand(cmd) {
        for (let i = 0; i < this.commands.length; ++i) {
            if (this.commands[i].command === cmd) {
                return this.commands[i];
            }
        }
    }


    completion(s, callback) {
        console.log('Completion called for ' + s);
        const term = this.myterm;
        let cmd = term.get_command();
        const words = CommandLineInterpreter.filterNoise(CommandLineInterpreter.tokenize(cmd));
        if (words.length === 0) {
            return;
        }
        const completions = [];
        if ((words.length === 1) && (s === words[0])) {
            for (let i = 0; i < this.commands.length; ++i) {
                cmd = this.commands[i].command;
                if (cmd.indexOf(s) === 0) {
                    completions.push(cmd);
                }
            }
            callback(completions);
        }
        else {
            cmd = this.findCommand(words[0].toString());
            if (cmd) {
                let prefix = '';
                let iarg = words.length - 1;
                if ((iarg > 0) && words[iarg].getName) {
                    if (s !== '') {
                        prefix = words[iarg].getName() + '=';
                        s = words[iarg].getValue();
                    }
                    const argname = words[iarg].getName();
                    for (iarg = 0; iarg < cmd.argdefs.length; ++iarg) {
                        if (cmd.argdefs[iarg].name === argname) {
                            ++iarg;
                            break;
                        }
                    }
                }
                if (iarg <= cmd.argdefs.length) {
                    // Check whether the last argument had a value, and if not, whether it
                    // is optional.
                    if ((iarg > 0) && (typeof words[iarg] === 'string') &&
                        ((words[iarg] === '') || (words[iarg] === '-'))) {
                        const lastarg = cmd.argdefs[iarg - 1];
                        if (!lastarg.isOptional()) {
                            // Trying to skip a required argument
                            return;
                        }
                    }
                }
                let arg;
                if (s === '') {
                    if (iarg >= cmd.argdefs.length) {
                        return;
                    }
                    arg = cmd.argdefs[iarg];
                    const noise = arg.noise || arg.name;
                    if (noise) {
                        this.myterm.insert('(' + noise + ') ');
                        console.log(this.myterm.get_command());
                    }
                }
                else {
                    arg = cmd.argdefs[--iarg];
                    if (arg.isFile()) {
                        const path = this.fullPath(this.cwd, s);
                        let container;
                        if (arg.isContainer()) container = true;
                        const jqxhr = $.file('doFileOp', {op: 'fcmp', path: path, container: container}, {context: this});
                        jqxhr.done(function (result) {
                            if (result && result.status && (result.status > 0)) {
                                if (result.matches && (result.matches.length > 0)) {
                                    const n = s.lastIndexOf('/');
                                    for (let i = 0; i < result.matches.length; ++i) {
                                        if (n >= 0) result.matches[i] = s.slice(0, n + 1) + result.matches[i];
                                        result.matches[i] = prefix + result.matches[i];
                                    }
                                    callback(result.matches);
                                    const cmd = term.get_command();
                                    term.set_command(cmd.trim());
                                }
                            }
                        });
                    }
                }
            }
        }
    }

    fullPath(dir, path) {
        if (path.charAt(0) !== '/') {
            if (dir.slice(-1) === '/') dir = dir.slice(0, -1);
            path = dir + '/' + path;
        }
        let n = 0;
        while (path.length > 1) {
            n = path.search(/(\/\.\.)(?:$|\/)/g);
            if (n >= 0) {
                const k = (n === 0) ? 0 : path.lastIndexOf('/', n - 1);
                if (k >= 0) path = path.slice(0, k) + path.slice(n + 3);
            }
            else {
                n = path.search(/(\/\.)(?:$|\/)/g);
                if (n >= 0) {
                    path = path.slice(0, n) + path.slice(n + 2);
                }
                else break;
            }
        }
        if (!path) path = '/';
        else if ((path.length > 1) && (path.slice(-1) === '/')) path = path.slice(0, -1);
        return path;
    }

    chdir(pushflag) {
        let dir = this.args.dir;
        if (dir == null) {
            const user = $.session('getUser');
            if (user && user.name) {
                dir = '/home/' + user.name;
            }
            else dir = '/';
        }
        else {
            dir = this.fullPath(this.cwd, dir);
        }
        const jqxhr = $.file('lookup', {path: dir}, {context: this});
        jqxhr.done(function (result) {
            if (result && result.status && (result.status < 0)) {
                if (pushflag) {
                    this.cwd = this.dirstack.pop();
                }
                this.showError(result);
            }
            else if (result.container) {
                this.cwd = result.path;
            }
            else {
                this.myterm.error(result.path + ' is not a container.');
                if (pushflag) this.cwd = this.dirstack.pop();
            }
        });
        this.setFail(jqxhr);
    }

    pwd() {
        this.myterm.echo(this.cwd);
    }

    pushd() {
        this.dirstack.push(this.cwd);
        this.chdir(true);
    }

    popd() {
        if (this.dirstack.length === 0) {
            this.myterm.echo('Directory stack is empty.');
        }
        else {
            this.cwd = this.dirstack.pop();
            this.myterm.echo(this.cwd);
        }
    }

    initCommands() {
        this.commands = [
            new CommandDef('help', 'show this information',
                [new CommandArg('command', this.parseString, 'command name', 'optional')], this.help),
            new CommandDef('exit', 'exit command line interpreter', [], this.exit),
            new CommandDef('cd', 'change current directory',
                [new CommandArg('dir', this.parseString, 'directory', 'file', 'container', 'optional')], this.chdir),
            new CommandDef('pushd', 'push new current directory',
                [new CommandArg('dir', this.parseString, 'directory', 'file', 'container')], this.pushd),
            new CommandDef('popd', 'pop current directory stack', [], this.popd),
            new CommandDef('pwd', 'print current working directory', [], this.pwd),
            new CommandDef('create', 'create a new group (deprecated, use mkgroup)',
                [new CommandArg('group', this.parseString, 'new group path', 'file'),
                    new CommandArg('description', this.parseString)],
                this.create),
            new CommandDef('mkgroup', 'create a new group',
                [new CommandArg('group', this.parseString, 'new group path', 'file'),
                    new CommandArg('description', this.parseString)],
                this.create),
            new CommandDef('groups', 'list the immediate subgroups of a group',
                [new CommandArg('group', this.parseString, 'group path', 'file')], this.groups),
            new CommandDef('groups!', 'list all descendant groups of a group',
                [new CommandArg('group', this.parseString, 'group path', 'file')], this.allGroups),
            new CommandDef('users', 'list the users in a group',
                [new CommandArg('group', this.parseString, 'group path', 'file')], this.users),
            new CommandDef('users!', 'list the users in a group and all its descendants',
                [new CommandArg('group', this.parseString, 'group path', 'file')], this.allUsers),
            new CommandDef('adduser', 'add users to a group',
                [new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('users', this.parseString, 'user list', 'list')], this.adduser),
            new CommandDef('rmuser', 'remove users from a group',
                [new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('users', this.parseString, 'user list', 'list')], this.remuser),
            new CommandDef('mkuser', 'create a user',
                [new CommandArg('username', this.parseString),
                    new CommandArg('password', this.parseString),
                    new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('email', this.parseString, null, 'optional'),
                    new CommandArg('regcode', this.parseString, 'registration code', 'optional')], this.mkuser),
            new CommandDef('ucopy', 'copy users between groups',
                [new CommandArg('dstgroup', this.parseString, 'group path', 'file'),
                    new CommandArg('srcgroup', this.parseString, 'group path', 'file'),
                    new CommandArg('users', this.parseString, 'user list', 'list'),
                    new CommandArg('rename', this.parsePair, 'rename pairs list', 'list')], this.ucopy),
            new CommandDef('gmove', 'move a group to a new parent',
                [new CommandArg('dstpath', this.parseString, 'parent path', 'file'),
                    new CommandArg('srcgroup', this.parseString, 'group path', 'file')], this.gmove),
            new CommandDef('gattr', 'enable/disable login/signup',
                [new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('login', this.parseBoolean, null, 'optional'),
                    new CommandArg('signup', this.parseBoolean, null, 'optional'),
                    new CommandArg('captcha', this.parseBoolean, null, 'optional'),
                    new CommandArg('guest', this.parseString, 'guest page', 'optional'),
                    new CommandArg('home', this.parseString, 'home page', 'optional'),
                    new CommandArg('desc', this.parseString, 'description', 'optional'),
                    new CommandArg('googleLoginEnabled', this.parseBoolean, 'enable Google login', 'optional'),
                    new CommandArg('googleSignupEnabled', this.parseBoolean, 'enable Google signup', 'optional'),
                    new CommandArg('verifyEmailEnabled', this.parseBoolean, 'verify email', 'optional'),
                    new CommandArg('regKey', this.parseString, 'self-registration key', 'optional')],
                this.gattr),
            new CommandDef('rmgroup', 'remove an empty group that has no subgroups',
                [new CommandArg('group', this.parseString, 'group path', 'file')], this.remgroup),
            new CommandDef('rmgroup!', 'remove a group and its descendants',
                [new CommandArg('group', this.parseString, 'group path', 'file')], this.remAllGroup),
            new CommandDef('ls', 'list files',
                [new CommandArg('path', this.parseString, 'file path', 'file', 'optional'),
                    new CommandArg('folder', this.parseLiteral, null, 'optional')], this.ls),
            new CommandDef('mkdir', 'create a folder',
                [new CommandArg('path', this.parseString, 'folder path', 'file'),
                    new CommandArg('recursive', this.parseLiteral, null, 'optional')], this.mkdir),
            new CommandDef('lookup', 'show file details',
                [new CommandArg('path', this.parseString, 'file path', 'file')], this.lookup),
            new CommandDef('link', 'create link to existing file',
                [new CommandArg('srcpath', this.parseString, 'source file', 'file'),
                    new CommandArg('dstpath', this.parseString, 'target', 'file')], this.link),
            new CommandDef('mv', 'rename a file',
                [new CommandArg('srcpath', this.parseString, 'current path', 'file'),
                    new CommandArg('dstpath', this.parseString, 'new path', 'file')], this.mv),
            new CommandDef('rm', 'remove a file and optionally its descendants',
                [new CommandArg('path', this.parseString, 'file path', 'file'),
                    new CommandArg('recursive', this.parseLiteral, 'recursive?', 'optional')], this.rm),
            new CommandDef('mkpolicy', 'create an access policy',
                [new CommandArg('path', this.parseString, 'policy path', 'file'),
                    new CommandArg('desc', this.parseString, 'description', 'optional')], this.mkpolicy),
            new CommandDef('addrole', 'add a principal role assignment to a policy',
                [new CommandArg('path', this.parseString, 'policy path', 'file'),
                    new CommandArg('principal', this.parseString),
                    new CommandArg('role', this.parseString)], this.addrole),
            new CommandDef('rmrole', 'remove a principal role assignment from a policy',
                [new CommandArg('path', this.parseString, 'policy path', 'file'),
                    new CommandArg('principal', this.parseString),
                    new CommandArg('role', this.parseString)], this.rmrole),
            new CommandDef('lspolicy', 'list the role assignments of a policy',
                [new CommandArg('path', this.parseString, 'policy path', 'file')], this.lspolicy),
            new CommandDef('lsrole', 'list rights associated with a role',
                [new CommandArg('role', this.parseString, 'role name')], this.lsrole),
            new CommandDef('mkrole', 'create a new role',
                [new CommandArg('name', this.parseString, 'role name'),
                    new CommandArg('description', this.parseString, null, 'optional'),
                    new CommandArg('rights', this.parseString, 'rights list', 'optional', 'list')], this.mkrole),
            new CommandDef('edrole', 'add or remove rights from a role',
                [new CommandArg('role', this.parseString, 'role name'),
                    new CommandArg('rights', this.parseString, 'rights list', 'list')], this.edrole),
            new CommandDef('share', 'assign a policy to file(s)',
                [new CommandArg('policy', this.parseString, 'policy path', 'file'),
                    new CommandArg('filespec', this.parseString)], this.share),
            new CommandDef('unshare', 'remove a policy from file(s)',
                [new CommandArg('policy', this.parseString, 'policy path', 'file'),
                    new CommandArg('filespec', this.parseString)], this.unshare),
            new CommandDef('pshare', 'create a path-based policy',
                [new CommandArg('policy', this.parseString, 'policy path', 'file'),
                    new CommandArg('ptype', this.parseString, 'prefix|globv1|regex'),
                    new CommandArg('pattern', this.parseString),
                    new CommandArg('mimetype', this.parseString, null, 'optional')], this.pshare),
            new CommandDef('punshare', 'remove a path-based policy',
                [new CommandArg('id', this.parseLong)], this.punshare),
            new CommandDef('pplist', 'list my path-based policies', [], this.pplist),
            new CommandDef('chown', 'change the owner of a file',
                [new CommandArg('path', this.parseString, 'file path', 'file'),
                    new CommandArg('owner', this.parseString, 'owner path', 'optional', 'file')], this.chown),
            new CommandDef('setmt', 'change the MIME type of a plain file',
                [new CommandArg('path', this.parseString, 'file path', 'file'),
                    new CommandArg('mimetype', this.parseString, 'MIME type')], this.setmt),
            new CommandDef('lsaccess', 'list policies applied to a file',
                [new CommandArg('path', this.parseString, 'file path', 'file')], this.lsaccess),
            new CommandDef('mkcomp', 'create a routing component from a text file',
                [new CommandArg('source', this.parseString, 'component source file', 'file'),
                    new CommandArg('output', this.parseString, 'component output file', 'optional', 'file')], this.ccomp),
            new CommandDef('lscomp', 'list component contents',
                [new CommandArg('component', this.parseString, 'component path', 'file')], this.lscomp),
            new CommandDef('mkjar', 'create a jar file',
                [new CommandArg('outpath', this.parseString, 'jar path', 'file'),
                    new CommandArg('inpath', this.parseString, 'source path', 'file'),
                    new CommandArg('fentry', this.parseBoolean, null, 'optional')], this.mkjar),
            new CommandDef('mklib', 'create a library',
                [new CommandArg('libpath', this.parseString, 'library path', 'file')], this.mklib),
            new CommandDef('pub', 'publish a component',
                [new CommandArg('libpath', this.parseString, 'library path', 'file'),
                    new CommandArg('groupId', this.parseString),
                    new CommandArg('artifactId', this.parseString),
                    new CommandArg('version', this.parseString),
                    new CommandArg('path', this.parseString, 'component path', 'file')], this.publish),
            new CommandDef('ccomp', 'compile a component (same as mkcomp)',
                [new CommandArg('source', this.parseString, 'component source file', 'file'),
                    new CommandArg('output', this.parseString, 'component output file', 'optional', 'file')], this.ccomp),
            new CommandDef('validate', 'validate DbManager cache',
                [new CommandArg('i', this.parseLiteral, null, 'optional'),
                    new CommandArg('c', this.parseLiteral, null, 'optional')], this.validate),
            new CommandDef('migrate', 'migrate Choice database to FSChoice', [], this.migrate),
            new CommandDef('adef', 'define metadata attribute',
                [new CommandArg('path', this.parseString, 'definition file path', 'file'),
                    new CommandArg('type', this.parseString, 'attribute type'),
                    new CommandArg('description', this.parseString, 'attribute description')], this.adef),
            new CommandDef('avalues', 'get all values of an attribute',
                [new CommandArg('path', this.parseString, 'definition file path', 'file'),
                    new CommandArg('prefix', this.parseString, 'target file path prefix', 'optional')], this.avalues),
            new CommandDef('aundef', 'undefine metadata attribute',
                [new CommandArg('path', this.parseString, 'definition file path', 'file'),
                    new CommandArg('force', this.parseBoolean, 'force removal', 'optional')], this.aundef),
            new CommandDef('who', 'who is on the system', [], this.who),
            new CommandDef('scriptgroup', 'set script file for a group',
                [new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('script', this.parseString, 'script path', 'optional', 'file'),
                    new CommandArg('reset', this.parseBoolean, 'reset user script indices?', 'optional')],
                this.scriptgroup),
            new CommandDef('liven', 'set live monitoring of a Choicelet',
                [new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('folder', this.parseString, 'user data folder', 'file'),
                    new CommandArg('choicelet', this.parseString, 'Choicelet name'),
                    new CommandArg('version', this.parseString, 'Choicelet version', 'optional'),
                    new CommandArg('livejs', this.parseString, 'live.js URL', 'optional'),
                    new CommandArg('interval', this.parseLong, 'update interval', 'optional')
                ], this.liven),
            new CommandDef('unliven', 'remove live monitoring of a Choicelet',
                [new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('choicelet', this.parseString, 'Choicelet name'),
                    new CommandArg('version', this.parseString, 'Choicelet version', 'optional')
                ], this.unliven),
            new CommandDef('gscript', 'set server-side script for a group',
                [new CommandArg('group', this.parseString, 'group path', 'file'),
                    new CommandArg('script', this.parseString, 'script path', 'file', 'optional')
                ], this.gscript),
            new CommandDef('cleanup', 'do filesystem cleanup tasks',
                [new CommandArg('what', this.parseString, 'choicedata-orphans|resource-orphans|datanode-refcounts'),
                    new CommandArg('doit', this.parseBoolean, 'take cleanup action', 'optional')
                ], this.cleanup),
            new CommandDef('download', 'download a file (or a folder as .zip)',
                [new CommandArg('path', this.parseString, 'file path', 'file'),
                    new CommandArg('incdir', this.parseBoolean, 'include folder name in zip paths', 'optional'),
                    new CommandArg('mimetype', this.parseString, 'MIME type', 'optional')
                ], this.download),
            new CommandDef('edit', 'edit a file',
                [new CommandArg('path', this.parseString, 'file path', 'file', 'optional')], this.edit),
            new CommandDef('mkmailer', 'create a mailer',
                [new CommandArg('path', this.parseString, 'file path', 'file'),
                    new CommandArg('host', this.parseString, 'SMTP relay host'),
                    new CommandArg('port', this.parseLong, 'relay host port', 'optional'),
                    new CommandArg('auth', this.parseBoolean, 'authenticate?'),
                    new CommandArg('starttls', this.parseBoolean, 'enable STARTTLS?'),
                    new CommandArg('username', this.parseString, 'relay username', 'optional'),
                    new CommandArg('password', this.parseString, 'relay password', 'optional')], this.mkmailer),
            new CommandDef('mail', 'send an email',
                [new CommandArg('mailer', this.parseString, 'mailer path', 'optional'),
                    new CommandArg('html', this.parseBoolean, 'HTML message?', 'optional'),
                    new CommandArg('from', this.parseString, 'sender email address', 'optional')], this.mail),
            new CommandDef('cfclear', 'clear entries in front-end cache',
                [new CommandArg('uri', this.parseString, 'uri path', 'optional'),
                    new CommandArg('resid', this.parseLong, 'resource id', 'optional')], this.cfclear),
            new CommandDef('cfdump', 'dump the front-end cache',
                [new CommandArg('what', this.parseString, 'resource id or uri path', 'optional')], this.cfdump),
            new CommandDef('alist', 'list metadata attributes of a file',
                [new CommandArg('path', this.parseString, 'file path', 'file')], this.alist),
            new CommandDef('aset', 'set metadata attribute on a file',
                [new CommandArg('path', this.parseString, 'file path', 'file'),
                    new CommandArg('attr', this.parseString, 'attribute path', 'file'),
                    new CommandArg('value', this.parseString, 'attribute value', 'optional')], this.aset)
        ];
        this.commands.sort(function (cmda, cmdb) {
            return cmda.command.localeCompare(cmdb.command);
        });
    }

    init(tag) {
//        $(tag).keypress($.proxy(function(e) {
//            if (e.which == 13) {
//                e.preventDefault();
//                this.parseCommand($(tag).val());
//                return false;
//            }
//        }, this));
        $(tag).focus();
    }

    setExit(exitFn) {
        this.myexit = exitFn;
    }

    setTerminal(term) {
        this.myterm = term;
    }

    static makeHelpString(cmd) {
        let argstr = '';
        for (const arg of cmd.argdefs) {
            if (arg.options.indexOf('optional') >= 0) {
                argstr += ` [${arg.name}]`;
            }
            else argstr += ` ${arg.name}`;
        }
        return `${cmd.command} ${argstr.substring(1)} - ${cmd.help}`;
    }

    help() {
        const help = CommandLineInterpreter.help;
        const helparg = this.args.command;
        // Is there an argument for help, and is it the name of a particular command?
        const cmd = (helparg) ? this.findCommand(helparg) : undefined;
        if (cmd) {
            // Yes, give help for that command
            this.myterm.echo(CommandLineInterpreter.makeHelpString(cmd));
        }
        else {
            // No, scan all the commands
            for (const cmd of this.commands) {
                // If there is a help argument, filter commands that start with that string
                if (!helparg || cmd.command.lastIndexOf(helparg, 0) === 0) {
                    this.myterm.echo('    ' + CommandLineInterpreter.makeHelpString(cmd));
                }
            }
            for (const helpLine of help) {
                this.myterm.echo(helpLine);
            }
        }
    }

    exit() {
        this.myterm.disable();
        this.FSWinlib.closeWindow(this.FSWinlib.getWindowName());
        if (this.myexit) {
            this.myexit();
        }
    }

    create() {
        const jqxhr = $.group('create', this.args.group, this.args.description);
        jqxhr.done($.proxy(function (result) {
            if (result && result.status && (result.status < 0)) {
                this.showError(result);
            }
            else {
                this.myterm.echo('Group ' + this.args.group + ' created.')
            }
        }, this));
        this.setFail(jqxhr);
    }

    groups(recurse) {
        const jqxhr = $.group('lsgroups', this.args.group, recurse);
        jqxhr.done($.proxy(function (result) {
            const groups = result.groups;
            if (result && result.status && (result.status < 0)) {
                this.showError(result);
            }
            else if (groups.length === 0) {
                this.myterm.echo(`<h3>${this.args.group} has no subgroups.</h3>`, {raw: true});
            }
            else {
                this.myterm.echo($('#cmdListGroups').tmpl({
                    hdr: 'Groups in ' + this.args.group,
                    groups: groups
                }).html(), {raw: true});
            }
        }, this));
        this.setFail(jqxhr);
        this.clearcmd = false;
    }

    allGroups() {
        this.groups(true);
    }

    listUsers(gname, users, hdr) {
        hdr = hdr || 'Users in';
        const fields = [
            {header: 'Id', field: 'id'},
            {header: 'Username', field: 'username'},
            {header: 'EMail', field: 'email'},
            {header: 'Reg. Code', field: 'regcode'}
        ];
        const attrs = [];

        function helper() {
            const utableId = ++this.utableId;
            const tableId = 'utable' + utableId;
            const linkId = 'utlink' + utableId;
            // The username field does not always correspond to the filename,
            // if the user has different names in the same or different groups.
            for (const user of users) {
                const filename = user.path.match(/.*\/(.+)$/);
                if (filename) {
                    user.username = filename[1];
                }
            }
            this.myterm.echo($('#cmdListUsers').tmpl({
                tableId: tableId,
                hdr: 'Users in',
                gname: gname,
                fields: fields,
                attrs: attrs,
                users: users
            }).html(), {raw: true});
            this.myterm.echo('<div><a href="#" id="' + linkId + '" class="utcsv">Download as .csv</a></div>',
                {raw: true});
            // The terminal output above does not show up in the DOM immediately. It's also
            // possible that the terminal removes and adds DOM elements as the terminal scrolls.
            // So we use a delegated event handler.
            this.termdiv.on('click.gmgt', '#' + linkId, $.proxy(function (event) {
                const linkelem = $(event.target);
                console.log('click handler sees element id ' + linkelem.attr('id'));
                if (linkelem.attr('href') !== '#') {
                    // This should be the case where the promise.done function below
                    // has clicked the link programmatically.
                    console.log('ignoring utcsv link click: ' + linkelem.attr('href'));
                    // Because there may be multiple tables in the terminal window, all
                    // using the same .csv filename on the server, each time the user
                    // clicks the link, re-generate the server data file.
                    setTimeout(function () {
                        linkelem.attr('href', '#');
                    }, 1000);
                    return;
                }
                const promise = this.tableToCsv($('#' + tableId));
                promise.done(function (tocsv) {
                    if (tocsv.status > 0) {
                        const path = tocsv.path + '/' + tocsv.name;
                        linkelem.attr('href', $.session('getContextRoot', path + '?api=file'));
                        linkelem[0].click();
                    }
                });
                event.preventDefault();
                event.stopImmediatePropagation();
            }, this));
        }

        this.getUserAttrs(0, users, attrs).done($.proxy(helper, this));
    }

    getUserAttrs(uindex, users, attrs) {
        attrs = attrs || [];
        const deferred = $.Deferred();

        function helper() {
            if (uindex < users.length) {
                const promise = $.file('getAttributeValues', {path: users[uindex].paths[0]});
                promise.done(function (ga) {
                    if (ga.status > 0) {
                        for (const attr of ga.attributes) {
                            if (attr.status > 0) {
                                let name = attr.name;
                                if (name.lastIndexOf('/System/Attributes/', 0) >= 0) {
                                    name = name.substring(19);
                                }
                                if (attrs.indexOf(name) < 0) {
                                    attrs.push(name);
                                }
                                users[uindex][name] = attr.value;
                            }
                        }
                    }
                    ++uindex;
                    helper();
                });
            }
            else deferred.resolve(attrs);
        }

        helper();
        return deferred.promise();
    }

    tableToCsv(elem) {
        function getText(elems) {
            return elems.map((idx, elem) => $(elem).text()).toArray();
        }

        const table = elem,
            hdrs = getText(table.find('th')),
            tbody = table.find('tbody'),
            trs = tbody.find('tr'),
            rows = [];
        trs.each(function () {
            const cols = getText($(this).find('td'));
            rows.push(cols);
        });
        return $.file('mkcsv', {headers: hdrs, data: rows});
    }

    users() {
        const jqxhr = $.group('lsusers', this.args.group);
        jqxhr.done($.proxy(function (result) {
            if (result.status && (result.status > 0)) {
                this.listUsers(this.args.group, result.users);
            }
            else this.showError(result);
        }, this));
        this.setFail(jqxhr);
        this.clearcmd = false;
    }

    allUsers() {
        const jqxhr = $.group('lsusers', this.args.group, true);
        jqxhr.done($.proxy(function (result) {
            if (result.status && (result.status > 0)) {
                const users = result.users;
                const uniqueUsers = [];
                let lastuid = -1;
                for (const user of users) {
                    if (user.id !== lastuid) {
                        uniqueUsers.push(user);
                        lastuid = user.id;
                    }
                }
                this.listUsers(this.args.group, uniqueUsers, 'Users under');
            }
        }, this));
        this.setFail(jqxhr);
        this.clearcmd = false;
    }

    adduser() {
        const jqxhr = $.group('addUsers', this.args.group, this.args.users);
        jqxhr.done($.proxy(function (result) {
            if (result && result.status) {
                this.showError(result);
                return;
            }
            for (const uresult of result) {
                if (uresult.status && (uresult.status < 0)) {
                    this.showError(uresult);
                }
                else {
                    this.myterm.echo('User ' + uresult.username + ' added');
                }
            }
        }, this));
        this.setFail(jqxhr);
    }

    remuser() {
        const ulist = $('<ul class="ulist"></ul>');
        const group = this.args.group,
              jqxhr = $.group('rmusers', group, this.args.users);
        jqxhr.done($.proxy(function (result) {
            if (result && result.status) {
                if (result.user) {
                    ulist.append($('<li style="color: red;">User ' +
                        result.user + ' not removed: ' + result.msg + '</li>'));
                }
                else if (result.msg) {
                    ulist.append($('<li style="color: red;">Error: ' +
                        result.msg + '</li>'));
                }
                this.myterm.echo(ulist.html(), {raw: true});
                return;
            }
            for (const uresult of result) {
                ulist.append($('<li>User ' + uresult.user + ' removed</li>'));
            }
            this.myterm.echo(ulist.html(), {raw: true});
        }, this));
        this.setFail(jqxhr);
    }

    mkuser() {
        const username = this.args.username,
              password = this.args.password,
              group = this.args.group,
              email = this.args.email,
              regcode = this.args.regcode;
        const jqxhr = $.group('mkuser', username, password, email, regcode, group);
        jqxhr.done($.proxy(function (result) {
            if (result && (result.status < 0)) {
                this.showError(result);
                return;
            }
            this.myterm.echo('<p>id=' + result.id + ', username=' +
                result.username + ', password=' + result.password + '</p>', {raw: true});
        }, this));
        this.setFail(jqxhr);
    }

    ucopy() {
        const dstgroup = this.args.dstgroup,
              srcgroup = this.args.srcgroup,
              users = this.args.users,
              rename = this.args.rename;
        const jqxhr = $.group('copyUsers', dstgroup, srcgroup, users, rename);
        jqxhr.done($.proxy(function (result) {
            if (result.status && (result.status < 0)) {
                this.showError(result);
                return;
            }
            this.myterm.echo('<p>Status ' + result.status + '</p>', {raw: true});
            if (result.length && (result.length > 0)) {
                this.myterm.echo('<p>Users copied:</p>', {raw: true});
                const elem = $('<ul></ul>');
                for (const uentry of result) {
                    if (uentry.status > 0) elem.append($('<li>' + uentry.user + ' - ok' + '</li>'));
                    else elem.append($('<li style="color: red;">' + uentry.user + ' - failed: ' + uentry.msg + '</li>'));
                }
                this.myterm.echo(elem.html(), {raw: true});
            }
        }, this));
    }

    gmove() {
        const dstpath = this.args.dstpath,
              srcgroup = this.args.srcgroup;
        const jqxhr = $.group('moveGroup', dstpath, srcgroup);
        jqxhr.done($.proxy(function (result) {
            if (result.status && (result.status < 0)) {
                this.showError(result);
                return;
            }
            this.myterm.echo('Completed.');
        }, this));
        this.setFail(jqxhr);
    }

    gattr() {
        const group = this.args.group,
              attrs = [];
        if (this.args.login !== undefined) {
            attrs.push({name: 'login', value: this.args.login});
        }
        if (this.args.signup !== undefined) {
            attrs.push({name: 'signup', value: this.args.signup});
        }
        if (this.args.captcha !== undefined) {
            attrs.push({name: 'captcha', value: this.args.captcha});
        }
        if (this.args.guest !== undefined) {
            let guest = this.args.guest;
            if (!guest || (guest === 'none')) guest = null;
            attrs.push({name: 'guest', value: guest});
        }
        if (this.args.home !== undefined) {
            let home = this.args.home;
            if (!home || (home === 'none')) home = null;
            attrs.push({name: 'home', value: home});
        }
        if (this.args.desc !== undefined) {
            let desc = this.args.desc;
            if (!desc || (desc === 'none')) desc = null;
            attrs.push({name: 'desc', value: desc});
        }
        if (this.args.googleLoginEnabled !== undefined) {
            attrs.push({name: 'googleLoginEnabled', value: this.args.googleLoginEnabled});
        }
        if (this.args.googleSignupEnabled !== undefined) {
            attrs.push({name: 'googleSignupEnabled', value: this.args.googleSignupEnabled});
        }
        if (this.args.verifyEmailEnabled !== undefined) {
            attrs.push({name: 'verifyEmailEnabled', value: this.args.verifyEmailEnabled});
        }
        if (this.args.regKey !== undefined) {
            const key = this.args.regKey;
            attrs.push({name: 'regKey', value: (key && (key !== 'none')) ? key : null});
        }
        if (attrs.length === 0) {
            this.myterm.echo('no recognized attribute specified');
            return;
        }
        const jqxhr = $.group('set', group, attrs);
        jqxhr.done($.proxy(function (result) {
            if (result.status && (result.status < 0)) {
                this.showError(result);
                return;
            }
            this.myterm.echo('Completed.');
        }, this));
        this.setFail(jqxhr);
    }

    remgroup() {
        const group = this.args.group;
        const jqxhr = $.group('rmgroup', group);
        jqxhr.done($.proxy(function (result) {
            if (result.status && (result.status < 0)) {
                this.showError(result);
                return;
            }
            this.myterm.echo('Completed.');
        }, this));
        this.setFail(jqxhr);
    };


    remAllGroup() {
        const group = this.args.group,
              recursive = true;
        const jqxhr = $.group('rmgroup', group, recursive);
        jqxhr.done($.proxy(function (result) {
            if (result.status && (result.status < 0)) {
                this.showError(result);
                return;
            }
            this.myterm.echo('Completed.');
        }, this));
        this.setFail(jqxhr);
    }

    static formatTime(timeval) {
        if (timeval === undefined) {
            return '';
        }
        return (new Date(timeval)).toLocaleTimeString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
    }

    ls() {
        const parms = {path: (this.args.path) ? this.args.path : this.cwd, folder: this.args.folder},
              jqxhr = $.file('ls', parms, {context: this});
        jqxhr.done(function (obj) {
            if (obj.status && (obj.status < 0)) {
                this.showError(obj);
                return;
            }
            if (!obj.length) {
                this.myterm.echo("No files.");
                return;
            }
            let pos = 0;
            const self = this,
                  strobj = [];

            function keypress(event, term) {
                let key = String.fromCharCode(event.key || event.charCode || event.keyCode);
                if (key === "q") {
                    self.pagingFunction = undefined;
                    self.myterm.set_prompt(self.termPrompt);
                    return false;
                }
                let limit = ((pos + 30) < strobj.length) ? pos + 30 : strobj.length;
                listlines(term, pos, limit);
                if (limit >= strobj.length) {
                    self.pagingFunction = undefined;
                    self.myterm.set_prompt(self.termPrompt);
                }
                else {
                    self.myterm.set_prompt('[[gb;black;white]  -- more --  ]');
                }
                pos = limit;
                return false;
            }

            function columnize(objs, specs) {
                const maxlens = {};
                // First compute maximum length of each field, except any that are larger than
                // any max value in specs for the field.
                for (const obj of objs) {
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            const spec = specs[key],
                                  txt = obj[key],
                                  len = txt.length;
                            if ((spec === undefined) || (len <= spec.max)) {
                                if ((maxlens[key] === undefined) || (len > maxlens[key])) maxlens[key] = len;
                            }
                        }
                    }
                }
                // Now adjust all the fields up to the maximum length, taking account left or right
                // justification in specs.
                for (const obj of objs) {
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            const spec = specs[key];
                            let txt = obj[key];
                            const len = txt.length;
                            if (len < maxlens[key]) {
                                if ((spec === undefined) || (spec.justify === 'left')) {
                                    while (txt.length < maxlens[key]) txt = txt + ' ';
                                    obj[key] = txt;
                                }
                                else if (spec.justify === 'right') {
                                    while (txt.length < maxlens[key]) txt = ' ' + txt;
                                    obj[key] = txt;
                                }
                            }
                        }
                    }
                }
            }

            function listlines(term, pos, limit) {
                for (let j = pos; j < limit; ++j) {
                    const lineobj = strobj[j];
                    term.echo(lineobj.name + ' ' + lineobj.folder + ' ' + lineobj.size + ' ' + lineobj.mtype + ' ' +
                        lineobj.refcount + ' ' + lineobj.mtime + ' ' + lineobj.altid);
                }
            }

            const mapped = obj.map(function (o, i) {
                return {index: i, value: o.name.toLowerCase()};
            });
            mapped.sort(function (a, b) {
                return +(a.value > b.value) || +(a.value === b.value) - 1;
            });
            obj = mapped.map(function (el) {
                return obj[el.index];
            });
            for (const result of obj) {
                strobj.push({
                    name: result.name,
                    folder: (result.container === undefined) ? '' : (result.container ? 'D' : ' '),
                    size: (result.size === undefined) ? '' : result.size.toString(),
                    mtype: (result.mimetype === undefined) ? '' : result.mimetype,
                    refcount: (result.refcount === undefined) ? '' : result.refcount.toString(),
                    mtime: CommandLineInterpreter.formatTime(result.mtime),
                    altid: (result.altid === undefined) ? '' : result.altid.toString()
                });
            }
            columnize(strobj, {
                name: {justify: 'left', max: 24},
                folder: {justify: 'right', max: 1},
                size: {justify: 'right', max: 6},
                mtype: {justify: 'left', max: 24},
                refcount: {justify: 'right', max: 4},
                mtime: {justify: 'right', max: 36},
                altid: {justify: 'right', max: 4}
            });
            if (obj.length <= 30) {
                listlines(this.myterm, 0, obj.length)
            }
            else {
                this.pagingFunction = keypress;
                listlines(this.myterm, 0, 30);
                this.myterm.set_prompt('[[gb;black;white]  -- more --  ]');
                pos = 30;
            }
        });
        this.setFail(jqxhr);
    }

    mkdir() {
        const parms = {path: this.args.path, recursive: this.args.recursive},
              jqxhr = $.file('mkdir', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    lookup() {
        const path = this.args.path,
              id = Number(path),
              parms = (isNaN(id)) ? {path: path} : {id: id},
              jqxhr = $.file('lookup', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                for (const v in obj) {
                    if (obj.hasOwnProperty(v)) {
                        let vval;
                        switch (v) {
                            case 'crtime':
                            case 'mtime':
                                vval = CommandLineInterpreter.formatTime(obj[v]) + ' [' + obj[v] + ']';
                                break;
                            default:
                                vval = obj[v];
                                break;
                        }
                        this.myterm.echo(v + ': ' + vval);
                    }
                }
                return;
            }
            this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    rm() {
        const parms = {path: this.args.path, recursive: this.args.recursive},
              jqxhr = $.file('rm', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    mkpolicy() {
        const parms = {
                path: this.args.path,
                desc: this.args.desc
              },
              jqxhr = $.file('mkpolicy', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    addrole() {
        const parms = {
                path: this.args.path,
                list: [{
                    principal: this.args.principal,
                    role: this.args.role
                }]
            },
            jqxhr = $.file('addrole', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.length !== undefined) && (obj.length > 0)) {
                for (var i = 0; i < obj.length; ++i) {
                    var entry = obj[i];
                    var ok = 'ok';
                    if (entry.status < 1) {
                        ok = 'failed'
                    }
                    this.myterm.echo('Add role ' + entry.role + ' for principal ' + entry.principal + ': ' + ok);
                    if (entry.status < 1) this.showError(entry);
                }
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    };


    rmrole() {
        const parms = {
                path: this.args.path,
                list: [{
                    principal: this.args.principal,
                    role: this.args.role
                }]
              },
              jqxhr = $.file('rmrole', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.length !== undefined) && (obj.length > 0)) {
                for (const entry of obj) {
                    let ok = 'ok';
                    if (entry.status < 1) {
                        ok = 'failed'
                    }
                    this.myterm.echo('Remove role ' + entry.role + ' for principal ' + entry.principal + ': ' + ok);
                    if (entry.status < 1) this.showError(entry);
                }
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    lspolicy() {
        const parms = {path: this.args.path},
              jqxhr = $.file('lspolicy', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                const list = obj.list;
                for (const entry of list) {
                    this.myterm.echo(entry.principal + '(' + entry.principalId + ')\t' +
                        entry.role + '(' + entry.roleId + ')');
                    const rights = entry.rights;
                    if (rights && (rights.length > 0)) {
                        this.myterm.echo('\tAccess rights:');
                        for (const rdef of rights) {
                            this.myterm.echo('\t\t' + rdef.name + '(' + rdef.applicability + ') - ' + rdef.description);
                        }
                    }
                }
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    lsrole() {
        const parms = {role: this.args.role},
            jqxhr = $.file('lsrole', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                const rights = obj.rights;
                if (rights && (rights.length > 0)) {
                    this.myterm.echo('\tAccess rights for role ' + obj.role + '(' + obj.roleId + '):');
                    for (const rdef of rights) {
                        this.myterm.echo('\t\t' + rdef.name + '(' + rdef.applicability + ') - ' + rdef.description);
                    }
                }
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    mkrole() {
        const parms = {
                name: this.args.name,
                description: this.args.description,
                rights: this.args.rights
              },
              jqxhr = $.file('mkrole', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                this.myterm.echo('Role ' + obj.role + '(' + obj.roleId + ') created');
                if (obj.rights) {
                    this.myterm.echo('\tAccess rights for this role:');
                    for (const rdef of obj.rights) {
                        this.myterm.echo('\t\t' + rdef.name + '(' + rdef.applicability + ') - ' + rdef.description);
                    }
                }
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    edrole() {
        const parms = {
                role: this.args.role,
                rights: this.args.rights
              },
              jqxhr = $.file('edrole', parms, {context: this});
        jqxhr.done(function (obj) {
            if ($.isArray(obj)) {
                for (const entry of obj) {
                    if (entry.status >= 0) {
                        this.myterm.echo('right ' + entry.name + ' ' + entry.result);
                    }
                    else this.myterm.error('right ' + entry.name + ': ' + entry.msg);
                }
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    share() {
        const parms = {policy: this.args.policy, filespec: this.args.filespec},
              jqxhr = $.file('share', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                this.myterm.echo('' + obj.count + ' files shared');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    unshare() {
        const parms = {policy: this.args.policy, filespec: this.args.filespec},
              jqxhr = $.file('unshare', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                this.myterm.echo('' + obj.count + ' files unshared');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    pshare() {
        const parms = {
            policy: this.args.policy,
            ptype: this.args.ptype,
            pattern: this.args.pattern,
            mimetype: this.args.mimetype
        };
        if ((parms.ptype !== 'prefix') && (parms.ptype !== 'regex') && (parms.ptype !== 'globv1')) {
            this.myterm.echo('invalid pattern type: ' + parms.ptype);
            return;
        }
        const jqxhr = $.file('pshare', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                this.myterm.echo('Id of this path-based policy is ' + obj.id);
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    punshare() {
        const parms = {id: this.args.id},
              jqxhr = $.file('punshare', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                this.myterm.echo('Completed.');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    pplist() {
        const jqxhr = $.file('pplist', {context: this});
        jqxhr.done(function (obj) {
            if ($.isArray(obj)) {
                if (obj.length > 0) {
                    this.myterm.echo($('#cmdPPList').tmpl({hdr: 'Your path-based policies:', pplist: obj}).html(),
                        {raw: true});
                }
                else this.myterm.echo('You have no path-based policies.');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    chown() {
        const parms = {path: this.args.path, owner: this.args.owner},
              jqxhr = $.file('chown', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                this.myterm.echo('Changed owner of ' + obj.path + ' to ' + obj.owner);
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    setmt() {
        const parms = {path: this.args.path, mimetype: this.args.mimetype},
              jqxhr = $.file('setmt', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                this.myterm.echo('Set MIME type to ' + obj.mimetype + '.');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    lsaccess() {
        const parms = {path: this.args.path},
              jqxhr = $.file('lsaccess', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                const paths = obj.policies;
                if (paths && (paths.length > 0)) {
                    this.myterm.echo('Resource-based policies currently applied to ' + this.args.path + ':');
                    for (const path of paths) {
                        this.myterm.echo('\t' + path);
                    }
                }
                else this.myterm.echo('No resource-based policies found for ' + this.args.path);
                const pathPolicies = obj.pathPolicies;
                if (pathPolicies && (pathPolicies.length > 0)) {
                    this.myterm.echo('Path-based policies applicable to ' + this.args.path + ':');
                    for (const pp of pathPolicies) {
                        const policy = pp.policy;
                        this.myterm.echo('\t[' + pp.id + ']  ' + policy.path + '  On: ' + pp.pattern +
                            '  By: ' + pp.principal.path);
                    }
                }
                else this.myterm.echo('No path-based policies found for ' + this.args.path);
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    lscomp() {
        const parms = {
                component: this.args.component
              },
              jqxhr = $.file('rdcomp', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status > 0)) {
                const comp = obj.component,
                      routes = comp.routes,
                      group = comp.group;
                if (group !== undefined) {
                    this.myterm.echo('User group: ' + group);
                }
                if ((routes !== undefined) && routes.length) {
                    for (const route of routes) {
                        const path = route.path;
                        let url = route.urlParts.join('/'),
                            pathstr = path.path.join('/');
                        if (path.absolute) pathstr = '/' + pathstr;
                        if (url === '') url = '[]';
                        this.myterm.echo('\t' + url + ' --> ' + pathstr);
                    }
                }
                else this.myterm.echo('Component contains no routes.');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    mkjar() {
        const parms = {
                outpath: this.args.outpath,
                inpath: this.args.inpath,
                fentry: this.args.fentry
              },
              jqxhr = $.file('mkjar', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    mklib() {
        const parms = {
                libpath: this.args.libpath
              },
              jqxhr = $.file('mklib', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    publish() {
        const parms = {
                libpath: this.args.libpath,
                groupId: this.args.groupId,
                artifactId: this.args.artifactId,
                version: this.args.version,
                path: this.args.path
              },
              jqxhr = $.file('publish', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    link() {
        const parms = {
                srcpath: this.args.srcpath,
                dstpath: this.args.dstpath
              },
              jqxhr = $.file('link', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    mv() {
        const parms = {
                srcpath: this.args.srcpath,
                dstpath: this.args.dstpath
              },
              jqxhr = $.file('mv', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    ccomp() {
        const parms = {
                source: this.args.source,
                output: this.args.output
              },
              jqxhr = $.file('pcomp', parms, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.myterm.echo('Completed');
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    dumpValidate(obj) {
        let s = '', llength = 0;

        function app(t) {
            llength += t.length;
            s += t;
            if ((t === ', ') && (llength > 50)) {
                s += '\n';
                llength = 0;
            }
        }

        for (const p in obj) {
            if (obj.hasOwnProperty(p)) {
                if (s !== '') app(', ');
                app(p + '=' + obj[p]);
            }
        }
        this.myterm.echo(s);
    }

    scanValidate(name, entries) {
        if (entries && (entries.length > 0)) {
            this.myterm.echo(name);
            for (const e of entries) {
                if (this.args.i && !e.valid) {
                    this.dumpValidate(e);
                }
                else if (this.args.c && (e.count !== undefined) && (e.count > 0)) {
                    this.dumpValidate(e);
                }
            }
        }
        else this.myterm.echo(name + ': no entries');
    }

    validate() {
        const jqxhr = $.file('validate', {}, {context: this});
        jqxhr.done(function (obj) {
            if ((obj.status !== undefined) && (obj.status >= 0)) {
                this.scanValidate('Root Cache', obj.rootCache);
                this.scanValidate('Vnode Cache', obj.vnodeCache);
                this.scanValidate('FsName Cache', obj.fsnameCache);
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    migrate() {
        const jqxhr = $.file('doFileOp', {op: 'migrate'}, {context: this});
        jqxhr.done(function (obj) {
            if (obj.status !== undefined) {
                if (obj.status < 0) this.showError(obj);
                else {
                    this.myterm.echo(obj.msg);
                    if (obj.status === 0) {
                        setTimeout($.proxy(this.migrate, this), 60000);
                    }
                }
            }
        });
        this.setFail(jqxhr);
    }

    adef() {
        const parms = {
            path: this.args.path,
            atype: this.args.type,
            description: this.args.description
        };
        const jqxhr = $.file('defineAttribute', parms, {context: this});
        jqxhr.done(function (obj) {
            if (obj.status >= 0) {
                if (obj.status === 0) {
                    this.myterm.echo('Attribute ' + this.args.path + ' already exists');
                }
                else {
                    this.myterm.echo('Created attribute ' + obj.path + ' with id ' + obj.id);
                }
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    avalues() {
        const parms = {
            path: this.args.path
        };
        const prefix = this.args.prefix || '';
        const prefixlen = prefix.length;
        const jqxhr = $.file('getValuesOfAttribute', parms, {context: this});
        jqxhr.done(function (obj) {
            if (obj.status >= 0) {
                if (obj.status === 0) {
                    this.myterm.echo('No values for attribute ' + this.args.path);
                }
                else {
                    const values = obj.values;
                    for (const v of values) {
                        const file = v.file;
                        let showThis = true;
                        if (prefixlen > 0) {
                            showThis = (prefix === file.path.substr(0, prefixlen));
                            for (let pindex = 0; !showThis && (pindex < file.paths.length); ++pindex) {
                                showThis = (prefix === file.paths[pindex].substr(0, prefixlen));
                            }
                        }
                        if (showThis) {
                            if (v.status < 0) {
                                this.myterm.echo(file.path + ': ' + v.msg);
                            }
                            else {
                                let aval = v.value.value;
                                if (typeof aval === 'object') {
                                    aval = JSON.stringify(aval);
                                }
                                const setTime = (new Date(v.value.stime)).toLocaleString();
                                this.myterm.echo(file.path + ': value ' + aval + ' set at ' + setTime);
                            }
                        }
                    }
                }
            }
            else {
                const cwdlen = this.cwd.length;
                if ((cwdlen > 0) && (this.args.path.substr(0, cwdlen) === this.cwd)) {
                    this.args.path = this.args.path.substr(cwdlen);
                    this.avalues();
                }
                else this.showError(obj);
            }
        });
        this.setFail(jqxhr);
    }

    aundef() {
        const parms = {
            path: this.args.path
        };
        const jqxhr = $.file('getValuesOfAttribute', parms, {context: this});
        jqxhr.done(function (obj) {
            const apath = obj.path;

            function helper(obj) {
                const jqxhr = $.file('rm', {path: apath}, {context: this});
                jqxhr.done(function (obj) {
                    if (obj.status > 0) {
                        this.myterm.echo('Completed.');
                    }
                    else this.showError(obj);
                });
                this.setFail(jqxhr);
            }

            if (obj.status >= 0) {
                if (obj.status > 0) {
                    if (this.args.force) {
                        const rmdef = $.Deferred(),
                              context = this;

                        function rmvalue(values, index, result) {
                            if (index >= values.length) {
                                rmdef.resolveWith(context, result);
                                return;
                            }
                            const v = values[index];
                            const jqxhr = $.file('aset', {
                                    path: v.file.path,
                                    attributes: [{name: apath, value: null}]
                                },
                                {context: context});
                            jqxhr.done(function (obj) {
                                rmvalue(values, ++index, result && (obj.status > 0));
                            });
                            jqxhr.fail(function () {
                                rmdef.resolveWith(context, false);
                            });
                        }

                        const values = obj.values;
                        const p = rmdef.promise();
                        p.done(function (ok) {
                            if (ok) {
                                helper.call(context, {path: apath});
                            }
                        });
                        rmvalue(values, 0, true);
                    }
                    else {
                        this.myterm.echo('Attribute ' + obj.path + ' has ' + obj.status +
                            ' values assigned, and force not indicated.');
                    }
                }
                else helper.call(this, obj);
            }
            else this.showError(obj);
        });
        this.setFail(jqxhr);
    }

    who() {
        const jqxhr = $.file('lua', {path: '/lua/who.lua', asOwner: true, args: []}, {context: this});
        jqxhr.done(function (result) {
            if (result.status === 1) {
                const activeList = result.result;
                for (const ssum of activeList) {
                    this.myterm.echo(ssum.userPath + ' since ' + CommandLineInterpreter.formatTime(ssum.startTime) + ' from ' +
                        ssum.ipAddress);
                }
            }
            else this.showError(result);
        });
        this.setFail(jqxhr);
    }

    scriptgroup() {
        const args = [this.args.group];
        args.push((this.args.script === undefined) ? null : this.args.script);
        if (this.args.reset) {
            args.push('reset');
        }
        const jqxhr = $.file('lua', {path: '/lua/groupscript.lua', args: args}, {context: this});
        jqxhr.done(function (result) {
            if (result.status === 1) {
                this.myterm.echo(result.result);
            }
            else this.showError(result);
        });
        this.setFail(jqxhr);
    }

    livengroup(cmd) {
        const args = [cmd];
        args.push((this.args.group === undefined) ? null : this.args.group);
        args.push((this.args.folder === undefined) ? null : this.args.folder);
        args.push((this.args.choicelet === undefined) ? null : this.args.choicelet);
        args.push((this.args.version === undefined) ? null : this.args.version);
        args.push((this.args.livejs === undefined) ? null : this.args.livejs);
        args.push((this.args.interval === undefined) ? null : this.args.interval);

        const jqxhr = $.file('lua', {path: '/lua/livengroup.lua', args: args}, {context: this});
        jqxhr.done(function (result) {
            if (result.status === 1) {
                this.myterm.echo(JSON.stringify(result.value));
            }
            else this.showError(result);
        });
        this.setFail(jqxhr);
    }

    liven() {
        const args = ['liven'];
        args.push((this.args.group === undefined) ? null : this.args.group);
        args.push((this.args.folder === undefined) ? null : this.args.folder);
        args.push((this.args.choicelet === undefined) ? null : this.args.choicelet);
        args.push((this.args.version === undefined) ? null : this.args.version);
        args.push((this.args.livejs === undefined) ? null : this.args.livejs);
        args.push((this.args.interval === undefined) ? null : this.args.interval);

        const jqxhr = $.file('lua', {path: '/lua/livengroup.lua', args: args}, {context: this});
        jqxhr.done(function (result) {
            if (result.status === 1) {
                this.myterm.echo(JSON.stringify(result.value));
            }
            else this.showError(result);
        });
        this.setFail(jqxhr);
    }

    unliven() {
        const args = ['unliven'];
        args.push((this.args.group === undefined) ? null : this.args.group);
        args.push((this.args.choicelet === undefined) ? null : this.args.choicelet);
        args.push((this.args.version === undefined) ? null : this.args.version);

        const jqxhr = $.file('lua', {path: '/lua/livengroup.lua', args: args}, {context: this});
        jqxhr.done(function (result) {
            if (result.status === 1) {
                this.myterm.echo(JSON.stringify(result.value));
            }
            else this.showError(result);
        });
        this.setFail(jqxhr);
    }

    gscript() {
        const jqxhr = $.file('setAttributeValues', {
            path: this.args.group,
            attributes: [{name: 'UserScriptFile', value: this.args.script}]
        }, {context: this});
        jqxhr.done(function (result) {
            if (result.status === 1) {
                const attributes = result.attributes;
                if (attributes.length === 1) {
                    const attr = attributes[0];
                    if (attr.status === 1) {
                        this.myterm.echo('UserScriptFile set to ' + attr.value);
                        return;
                    }
                }
                this.myterm.echo('Unexpected result from server.');
            }
            else this.showError(result);
        });
        this.setFail(jqxhr);
    }

    cleanup() {
        const jqxhr = $.file('doFileOp', {
            op: 'cleanup',
            what: this.args.what,
            doit: this.args.doit
        }, {context: this});
        jqxhr.done(function (result) {
            if (result.status === 1) {
                for (const key in result) {
                    if (result.hasOwnProperty(key) && (key !== 'status')) {
                        this.myterm.echo(key + ': ' + JSON.stringify(result[key]));
                    }
                }
            }
            else this.showError(result);
        });
        this.setFail(jqxhr);
    }

    download() {
        const path = $.session('getContextRoot', this.args.path);
        let urlargs = '?api=file';
        if (this.args.incdir) {
            urlargs += '&incdir=true';
        }
        if (this.args.mimetype) {
            urlargs += '&type=' + this.args.mimetype;
        }
        window.open(path + urlargs, '_blank');
    }

    edit() {
        // This will receive the response from the window manager for the window creation
        const initialResponse = this.FSWinlib.receive('edit');
        const options = (this.args.path) ? {path: this.args.path} : {};
        // This will receive a message from the edit window asking for options
        const optionRequest = this.FSWinlib.receive('options');
        // Request window creation.
        const promise = this.FSWinlib.createWindow('edit.html', {
            width: 800,
            height: 600,
            title: this.args.path || 'New File',
            closed: false
        });
        // Wait for window manager response.
        promise.done($.proxy(function (emsg) {
            if (emsg.status > 0) {
                // Edit window created. Now wait for it to request options.
                const editWindow = emsg.window;
                optionRequest.done($.proxy(function (omsg) {
                    if (omsg.status > 0) {
                        // Send options
                        this.FSWinlib.send(editWindow, 'options', options, 'edit');
                    }
                }, this));
            }
        }, this));
    }

    mkmailer() {
        const reqobj = {
            op: 'mkmailer',
            path: this.args.path,
            settings: {
                host: this.args.host,
                port: this.args.port || undefined,
                auth: this.args.auth,
                starttls: this.args.starttls,
                username: this.args.username || undefined,
                password: this.args.password || undefined
            }
        };
        const promise = $.file('doFileOp', reqobj, {context: this});
        promise.done(function (result) {
            if (result.status > 0) {
                this.myterm.echo('Completed.');
            }
            else this.showError(result);
        });
    }

    mail() {
        function getAddresses(line) {
            const addrs = line.split(','),
                  result = [];
            for (const addr of addrs) {
                const taddr = addr.trim();
                if (taddr !== '') {
                    result.push(taddr);
                }
            }
            return result;
        }

        const reqobj = {
            op: 'smtp',
            mailer: this.args.mailer || undefined,
            message: {
                from: this.args.from || undefined,
                html: this.args.html || false
            }
        };
        this.myterm.read('To: ', $.proxy(function (line) {
            reqobj.message.to = getAddresses(line);
            this.myterm.read('CC: ', $.proxy(function (line) {
                reqobj.message.cc = getAddresses(line);
                this.myterm.read('Bcc: ', $.proxy(function (line) {
                    reqobj.message.bcc = getAddresses(line);
                    this.myterm.read('Subject: ', $.proxy(function (line) {
                        reqobj.message.subject = line;
                        let msg = '';
                        const eom = $.Deferred();
                        this.myterm.echo('Message:');

                        function readMessage(that) {
                            that.myterm.read('> ', $.proxy(function (line) {
                                if (msg !== '') msg += '\n';
                                if (line.trim() === '.') {
                                    eom.resolveWith(that, [msg]);
                                }
                                else {
                                    msg += line;
                                    readMessage(that);
                                }
                            }, this));
                        }

                        readMessage(this);
                        eom.done(function (msg) {
                            reqobj.message.content = msg;
                            const promise = $.file('doFileOp', reqobj, {context: this});
                            promise.done($.proxy(function (result) {
                                if (result.status > 0) {
                                    this.myterm.echo('Message sent.');
                                }
                                else this.showError(result);
                            }, this));
                        });
                    }, this));
                }, this));
            }, this));
        }, this));
    }

    cfclear() {
        const reqobj = {
            op: 'fecache',
            cmd: 'clear',
            uri: this.args.uri || undefined,
            resid: this.args.resid || undefined
        };
        const promise = $.file('doFileOp', reqobj, {context: this});
        promise.done($.proxy(function (result) {
            if (result.status > 0) {
                this.myterm.echo('Completed.');
            }
            else this.showError(result);
        }, this));
    };


    cfdump() {
        const reqobj = {
            op: 'fecache',
            cmd: 'dump'
        };
        const promise = $.file('doFileOp', reqobj, {context: this});
        promise.done($.proxy(function (result) {
            if (result.status > 0) {
                const arg = this.args.what;
                if (arg !== undefined) {
                    let resid = Number(arg);
                    if (isNaN(resid)) {
                        resid = undefined;
                        resid = [];
                        for (i = 0; i < result.names.length; ++i) {
                            if (result.names[i][0] === arg) {
                                resid.push(result.names[i][1]);
                            }
                        }
                        if (resid.length > 0) {
                            this.myterm.echo(arg + ' maps to resource ids [' + resid.join(', ') + ']');
                        }
                        else {
                            this.myterm.echo(arg + ' is not in the cache.');
                        }
                    }
                    else {
                        const idEntries = [];
                        for (let i = 0; i < result.ids.length; ++i) {
                            if (result.ids[i][0] === resid) {
                                idEntries.push(result.ids[i]);
                            }
                        }
                        if (idEntries.length > 0) {
                            for (let i = 0; i < idEntries.length; ++i) {
                                obj = idEntries[i][1];
                                this.myterm.echo(idEntries[i][0] + ' ==> { contentType: ' + obj.contentType +
                                    ', length: ' + obj.length + ', mtime: ' + CommandLineInterpreter.formatTime(obj.mtime) + ', resid: ' +
                                    obj.resid + ', seqnum: ' + obj.seqnum + ' }');
                            }
                        }
                        else {
                            this.myterm.echo('Resource id ' + resid + ' is not in the cache.');
                        }
                    }
                }
                else {
                    this.myterm.echo('Name To Resource Id Entries:');
                    for (let i = 0; i < result.names.length; ++i) {
                        this.myterm.echo(result.names[i][0] + ' ==> ' + result.names[i][1]);
                    }
                    this.myterm.echo('Resource Id To File Entries:');
                    for (i = 0; i < result.ids.length; ++i) {
                        const obj = result.ids[i][1];
                        this.myterm.echo(result.ids[i][0] + ' ==> { contentType: ' + obj.contentType +
                            ', length: ' + obj.length + ', mtime: ' + CommandLineInterpreter.formatTime(obj.mtime) + ', resid: ' +
                            obj.resid + ', seqnum: ' + obj.seqnum + ' }');
                    }
                }
            }
            else this.showError(result);
        }, this));
    }

    alist() {
        const reqobj = {
            op: 'aget',
            path: this.args.path
        };
        const promise = $.file('doFileOp', reqobj, {context: this});
        promise.then($.proxy(function (obj) {
            if (obj.status === 1) {
                const attributes = obj.attributes;
                let attrIndex = 0;
                const listAttributes = $.proxy(function () {
                    for (const attr of attributes) {
                        if (attr.status === 1) {
                            let v = attr.value;
                            if (attr.atype === 'JSON') {
                                v = JSON.stringify(v);
                            }
                            this.myterm.echo(attr.name + ' ' + attr.atype + ' ' + v + ' set ' +
                                CommandLineInterpreter.formatTime(attr.stime) + ' by ' + (attr.setterPath || attr.setter));
                        }
                        else if (attr.name) {
                            this.myterm.echo(attr.name + ' ' + attr.msg);
                        }
                        else {
                            this.myterm.echo(attr.msg);
                        }
                    }
                    if (attributes.length === 0) {
                        this.myterm.echo('No attributes.');
                    }

                }, this);

                function getSetter() {
                    if (attrIndex >= attributes.length) {
                        listAttributes();
                        return;
                    }
                    const attr = attributes[attrIndex++];
                    if (attr.status === 1) {
                        const promise = $.file('lookup', {id: attr.setter});
                        promise.then(function (lobj) {
                            if (lobj.status === 1) {
                                attr.setterPath = lobj.path;
                            }
                            getSetter();
                        });
                    }
                    else getSetter();
                }

                getSetter();
            }
        }, this));
    }

    aset() {
        let v = Number(this.args.value);
        if (isNaN(v)) {
            v = this.args.value;
        }
        const reqobj = {
            path: this.args.path,
            attributes: [
                {name: this.args.attr, value: v}
            ]
        };
        const promise = $.file('setAttributeValues', reqobj, {context: this});
        promise.then($.proxy(function (obj) {
            if (obj.status === 1) {
                obj = obj.attributes[0];
                if (obj.status === 1) {
                    this.myterm.echo('Done.');
                }
                else this.showError(obj);
            }
            else this.showError(obj);
        }, this));
    }

    static tokenize(cmd) {
        const words = [];
        cmd = cmd.trim();
        if (!cmd || cmd.length === 0) return words;
        const reWord = /^(([^\s'"=)(\[\]{}]+)|((["'])((\\?.)*?)\4)|([)(\[\]{}=]))/;
        while (cmd.length > 0) {
            let m = cmd.match(reWord);
            let len;
            if (m == null) {
                words.push(cmd);
                return words;
            }
            len = m[0].length;
            if (m[2] != null) {
                words.push(m[2]);
            }
            else if (m[5] != null) {
                words.push(new QuotedString(m[5].replace(/\\(['"])/g, '$1'), m[4]));
            }
            else if (m[7] != null) {
                if ((m[7] === '=') && (words.length > 0)) {
                    const argname = words[words.length - 1];
                    cmd = cmd.substring(len);
                    m = cmd.match(reWord);
                    if (m == null) {
                        words[words.length - 1] = new NamedArgument(argname, new QuotedString(cmd, '"'));
                        return words;
                    }
                    len = m[0].length;
                    if (m[2] != null) {
                        words[words.length - 1] = new NamedArgument(argname, m[2]);
                    }
                    else if (m[5] != null) {
                        words[words.length - 1] = new NamedArgument(argname, new QuotedString(m[5].replace(/\\(['"])/g, '$1'), m[4]));
                    }
                    else words.push(m[7]);
                }
                else words.push(m[7]);
            }
            cmd = cmd.substring(len).trim();
        }
        return words;
    }

    static filterNoise(words) {
        const result = [];
        let parenDepth = 0,
            rparen = false;
        for (let i = 0; i < words.length; ++i) {
            if (words[i] === '(') {
                if ((parenDepth === 0) && rparen) {
                    result.push('');
                    rparen = false;
                }
                ++parenDepth;
            }
            else if (parenDepth > 0) {
                if (words[i] === ')') {
                    if (--parenDepth === 0) rparen = true;
                }
            }
            else {
                result.push(words[i]);
                rparen = false;
            }
        }
        if (rparen) result.push('');
        return result;
    }

    parseCommand(cmd) {
        const words = CommandLineInterpreter.filterNoise(CommandLineInterpreter.tokenize(cmd));
        if (words.length === 0) {
            return;
        }
        const cmddef = this.findCommand(words[0].toString());
        if (cmddef == null) {
            this.myterm.echo("Unknown command");
        }
        else {
            const args = {};
            this.argerr = false;
            const windex = this.parseArgs(args, cmddef, 0, words, 1);
            if (!this.argerr) {
                this.args = args;
                cmddef.func.apply(this);
            }
        }
    }

    parseArgs(result, cmddef, argindex, words, windex) {
        if (this.argerr) {
            return argindex;
        }
        if (!cmddef.argdefs) {
            if (windex < words.length) {
                this.myterm.echo(cmddef.command + ' does not take arguments');
                this.argerr = true;
            }
            return argindex;
        }
        if (argindex >= cmddef.argdefs.length) {
            if (windex < words.length) {
                this.myterm.echo(cmddef.command + ' takes only ' + cmddef.argdefs.length + ' arguments.');
                this.argerr = true;
            }
            return argindex;
        }
        let argdef = cmddef.argdefs[argindex];
        if ((windex >= words.length) ||
            ((typeof words[windex] === 'string') && ((words[windex] === '') || (words[windex] === '-')))) {
            if (argdef.options.indexOf('optional') < 0) {
                this.myterm.echo('missing required argument ' + argdef.name + '\n');
                this.argerr = true;
                return argindex;
            }
            return this.parseArgs(result, cmddef, argindex + 1, words, windex + 1);
        }
        // Check for named argument
        if (words[windex].getName) {
            const argname = words[windex].getName();
            for (argindex = 0; argindex < cmddef.argdefs.length; ++argindex) {
                argdef = cmddef.argdefs[argindex];
                if (argdef.name === argname) {
                    words[windex] = words[windex].getValue();
                    break;
                }
            }
            if (argindex >= cmddef.argdefs.length) {
                this.myterm.echo('unknown argument ' + argname + '\n');
                this.argerr = true;
                return argindex;
            }
        }
        if (argdef.options.indexOf('list') >= 0) {
            const dummy = {};
            const list = [];
            if (words[windex] === '[') {
                ++windex;
                while (windex < words.length) {
                    if (words[windex] === ']') {
                        ++windex;
                        break;
                    }
                    windex = argdef.parser.call(this, dummy, argdef, words, windex);
                    if (!this.argerr && (dummy[argdef.name] !== undefined)) {
                        list.push(dummy[argdef.name]);
                    }
                }
            }
            else {
                windex = argdef.parser.call(this, dummy, argdef, words, windex);
                if (!this.argerr && (dummy[argdef.name] !== undefined)) {
                    list.push(dummy[argdef.name]);
                }
            }
            result[argdef.name] = list;
        }
        else {
            windex = argdef.parser.call(this, result, argdef, words, windex);
        }
        return this.parseArgs(result, cmddef, argindex + 1, words, windex);
    }

    parseString(result, argdef, words, windex) {
        if (windex < words.length) {
            result[argdef.name] = words[windex++].toString();
            if (argdef.isFile()) {
                result[argdef.name] = this.fullPath(this.cwd, result[argdef.name]);
            }
        }
        else {
            this.myterm.echo('missing ' + argdef.name + ' argument');
            this.argerr = true;
        }
        return windex;
    }

    parseBoolean(result, argdef, words, windex) {
        function tobool(s) {
            if (s === 'true' || s === 'yes' || s === 'on' || s === 'enable') return true;
            if (s === 'false' || s === 'no' || s === 'off' || s === 'disable') return false;
            return undefined;
        }

        if (windex < words.length) {
            result[argdef.name] = tobool(words[windex++].toString());
        }
        else {
            this.myterm.echo('missing ' + argdef.name + ' argument');
            this.argerr = true;
        }
        return windex;
    }

    parseLong(result, argdef, words, windex) {
        if (windex < words.length) {
            const argstr = words[windex++];
            const n = Number(argstr.toString());
            if (isNaN(n)) {
                this.myterm.echo('invalid id number: ' + argstr + '\n');
                this.argerr = true;
            }
            else {
                result[argdef.name] = n;
            }
        }
        else {
            this.myterm.echo('missing ' + argdef.name + ' argument');
            this.argerr = true;
        }
        return windex;
    }

    parseLiteral(result, argdef, words, windex) {
        if (windex < words.length) {
            const argstr = words[windex++].toString();
            result[argdef.name] = false;
            if ((argstr === argdef.name) || (argdef.name.lastIndexOf(argstr, 0) === 0)) {
                result[argdef.name] = true;
            }
            else {
                this.myterm.echo('unrecognized argument: ' + argstr + '\n');
                this.argerr = true;
            }
        }
        else {
            this.myterm.echo('missing ' + argdef.name + ' argument');
            this.argerr = true;
        }
        return windex;
    }

    parsePair(result, argdef, words, windex) {
        function topair(s, result) {
            const p = s.split(':');
            if (p.length !== 2) {
                return false;
            }
            p[0] = p[0].trim();
            p[1] = p[1].trim();
            if (p[0] === '') {
                return false;
            }
            result[p[0]] = p[1];
            return true;
        }

        if (windex < words.length) {
            const argstr = words[windex++].toString(),
                pair = {},
                gotPair = topair(argstr, pair);
            if (gotPair) {
                result[argdef.name] = pair;
            }
            else {
                this.myterm.echo('invalid pair "' + argstr + '" in argument ' + argdef.name);
                this.argerr = true;
            }
        }
        else {
            this.myterm.echo('missing ' + argdef.name + ' argument');
            this.argerr = true;
        }
        return windex;
    }

    setFail(jqxhr) {
        jqxhr.fail($.proxy(function (xhr, status, error) {
            this.showError({
                msg: 'status ' + status + ': ' + error
            });
        }, this));
    }

    showError(result) {
        let msg = 'unknown error';
        if (result && result.msg) {
            msg = result.msg;
        }
        this.myterm.error('Error: ' + msg);
    }
}

CommandLineInterpreter.help =
    ['Use Ctrl-Space for command completion and parameter prompts, and for file path completion.',
        'Parameters are separated by space (not comma as previously).'];


export default CommandLineInterpreter;

    // var cmdInterpreter = new CommandLineInterpreter();
// });
