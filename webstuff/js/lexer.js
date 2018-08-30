define([], function() {
    
    var ws = /\s+/;
    
    function Identifier(name) {
        this.name = name;
    }
    
    Identifier.pattern = /^[A-Za-z_]\w*/;
    
    Identifier.match = function(input) {
        var id = input.getText().match(Identifier.pattern);
        if (id != null) {
            input.advance(id[0].length);
            return new Identifier(id[0]);
        }
        return null;
    };
    
    function IntNumber(value) {
        this.value = value | 0;
    }
    
    IntNumber.patternDec = /^\d+/;
    IntNumber.patternHex = /^0x[\da-fA-F]+/;
    
    IntNumber.match = function(input) {
        var text = input.getText();
        var dig = text.match(IntNumber.patternDec);
        if (dig != null) {
            input.advance(dig[0].length);
            return new IntNumber(parseInt(dig[0], 10));
        }
        dig = text.match(IntNumber.patternHex);
        if (dig != null) {
            input.advance(dig[0].length);
            return new IntNumber(parseInt(dig[0], 16));
        }
        return null;
    };

    function QuotedString(s) {
        this.value = s;
        this.length = s.length;
    }

    QuotedString.match = function(input) {
        var text = input.getText();
        var qchar = text.charCodeAt(0);
        if ((qchar == '\'') || (qchar == '"')) {
            var endpos = 1;
            var s = '';
            var bslash = false;
            var endchar = null;
            for (var i = 1; i < text.length; ++i) {
                var ch = text.charCodeAt(i);
                switch (ch) {
                    case qchar:
                        if (bslash) {
                            s += '\'';
                        }
                        else {
                            endchar = qchar;
                            endpos = i + 1;
                        }
                        break;
                    case '\\':
                        if (bslash) {
                            s += '\\';
                            bslash = false;
                        }
                        else {
                            bslash = true;
                        }
                        break;
                    case 'b':
                        s += ((bslash) ? '\b' : 'b');
                        bslash = false;
                        break;
                    case 'f':
                        s += ((bslash) ? '\f' : 'f');
                        bslash = false;
                        break;
                    case 'n':
                        s += ((bslash) ? '\n' : 'n');
                        bslash = false;
                        break;
                    case 't':
                        s += ((bslash) ? '\t' : 't');
                        bslash = false;
                        break;
                    case '\n':
                    case '\r':
                        endchar = ch;
                        endpos = i;
                        break;
                    default:
                        s += ch;
                        bslash = false;
                        break;
                }
                if (endchar != null) break;
            }
            var qs = new QuotedString(s);
            input.advance(endpos);
            if (endchar != qchar) {
                qs.error = 'unterminated quoted string';
            }
            return qs;
        }
        return null;
    };

    function InputStream(text) {
        this.text = ((text == null) || (typeof text != 'string')) ? '' : text;
        this.pos = 0;
        this.tokens = [];
        this.positions = [];
        return this;
    }
    
    InputStream.prototype.getText = function() {
        return (this.isEof()) ? '' : this.text.slice(this.pos);
    };
    
    InputStream.prototype.advance = function(length) {
        this.pos += length;
    };
    
    InputStream.prototype.append = function(text) {
        if ((text != null) && (typeof text == 'string')) {
            this.text += text;
        }
        return this;
    };
    
    InputStream.prototype.isEof = function() {
        return (this.pos >= this.text.length);
    };
    
    InputStream.prototype.isLiteral = function(s) {
        if (!this.isEof()) {
            if (this.text.lastIndexOf(s, 0) == 0) {
                this.pos += s.length;
                return true;
            }
        }
        return false;
    };
    
    InputStream.prototype.skipWS = function() {
        if (!this.isEof()) {
            var space = this.text.slice(this.pos).match(ws);
            if (space != null) {
                this.pos += space[0].length;
                return true;
            }
        }
        return false;
    };
    
    InputStream.prototype.identifier = function() {
        if (!this.isEof()) {
            return Identifier.match(this);
        }
    };

    InputStream.prototype.integer = function() {
        if (!this.isEof()) {
            return IntNumber.match(this);
        }
    };

    return {
        Identifier: Identifier,
        IntNumber: IntNumber,
        QuotedString: QuotedString,
        InputStream: InputStream
    };
});
