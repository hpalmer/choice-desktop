export default class NamedArgument {
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
