export default class QuotedString {
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
