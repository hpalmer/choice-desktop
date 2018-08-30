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
 * Factory for parsers of named token types.
 *
 * @author Howard Palmer
 * Created by Hep on 3/10/2018.
 */
class ParserFactory {
    constructor() {
        this._parsers = {};
    }

    register(tokenName, parser) {
        this._parsers[tokenName] = parser;
    }

    getParser(tokenName) { return this._parsers[tokenName]; }

    static get instance () {
        if (!_instance) {
            _instance = new ParserFactory();
        }
        return _instance;
    }
}

let _instance;

export default ParserFactory;
