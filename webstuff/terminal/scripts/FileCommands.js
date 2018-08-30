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
 * Commands related to file manipulation.
 *
 * @author Howard Palmer
 * Created by Hep on 3/10/2018.
 */
import CommandBase from 'terminal/CommandBase';
import ArgumentBase from 'terminal/ArgumentBase';

class FilePathArgument extends ArgumentBase {
    constructor(options) {
        super(options);
    }
}

class LsCommand extends CommandBase {
    constructor(name) {
        super(name || ['ls', 'list']);
        this._outputFormats = ['text', 'json'];
        this._shortHelp = 'list files';
        this._longHelp = `
        <div class="cmdhelp">
            <p><span class="cmdname">${name[0]}</span>
             [<span class="cmdargname">path</span>] [<span class="cmdarglit">full</span>]</p>
            <p>This command lists information about files at a specified path, or else the
            current folder if <span class="cmdargname">path</span> is not present.</p>
        </div>
        `;
        this.addArgument(new FilePathArgument({
            type: 'file',
            flags: ['optional']
        }));
    }
}