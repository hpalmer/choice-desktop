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
 * Base class for a terminal command module.
 *
 * @author Howard Palmer
 * Created by Hep on 3/10/2018.
 */

class CommandBase {
    constructor(name) {
        if (name && (typeof name === 'string' || name instanceof Array)) {
            this._name = name;
        }
        this._outputFormats = ['text'];
        this._shortHelp = '(not available)';
        this._longHelp = '(not available)';
        this._positionalArguments = [];
        this._keywordArguments = {};
        this._keywordCache = undefined;
    }

    get name () { return this._name; }

    get outputFormats () { return this._outputFormats; }

    hasOutputFormat(format) { return this._outputFormats.includes(format); }

    get help () { return this._shortHelp; }

    get longHelp () { return this._longHelp; }

    getPositionalArgument(index) {
        if (0 <= index < this._positionalArguments.length) {
            return this._positionalArguments[index]
        }
    }

    getKeywordArgument(keyword) {
        return this._keywordArguments[keyword] || this._positionalArguments.filter((arg) => arg.keyword === keyword)[0];
    }

    get keywords () {
        if (!this._keywordCache) {
            const keys = [];
            this._positionalArguments.forEach((arg) => (arg.keyword) ? keys.push(arg.keyword) : null);
            for (const key of Object.keys(this._keywordArguments)) {
                keys.push(key);
            }
            this._keywordCache = keys;
        }
        return this._keywordCache;
    }

    addArgument(argObject) {
        if (argObject.keyword) {
            assert(!this.getKeywordArgument(argObject.keyword));
        }
        if (argObject.flags && argObject.isKeywordOnly) {
            this._keywordArguments.push(argObject);
        }
        else {
            this._positionalArguments[argObject.keyword] = argObject;
        }
        this._keywordCache = undefined;
    }

}

export default CommandBase;
