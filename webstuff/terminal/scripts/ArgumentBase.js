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
 * Base class for a terminal command argument object.
 *
 * @author Howard Palmer
 * Created by Hep on 3/10/2018.
 */
class ArgumentBase {
    constructor(options) {
        this._type = options.type;
        this._category = options.category;
        this._flags = options.flags || [];
        this._keyword = options.keyword;
        this._shortHelp = options.help || '(no help)';
        this._longHelp = options['long-help'] || 'No help.'
    }

    get flags () { return this._flags; }

    get keyword () { return this._keyword; }

    get help () { return this._shortHelp; }

    get longHelp () { return this._longHelp; }

    get isKeywordOnly () { return this._flags.includes('keyword-only'); }

    get isOptional () { return this._flags.includes('optional'); }

    get isRequired () { return !this.isOptional; }


}

export default ArgumentBase;
