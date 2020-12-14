export class VarType {
  constructor(type) {
    this.type = type;
  }

  toString() {
    return `VarType(${this.type})`;
  }

  getTypeName() {
    return "" + this.type;
  }
}

export class ArrayType extends VarType {
  constructor(type, size, alias="") {
    super();

    this.alias = alias;
    this.type = type;
    this.size = size;
  }

  getTypeName() {
    if (this.alias.length > 0) {
      return this.alias;
    }

    return `${this.type.getTypeName()}[${this.size}]`;

  }
  toString() {
    return `ArrayType(${this.type}, ${this.size}, ${this.alias})`;
  }
}


export class DynamicArrayType extends ArrayType {
  constructor(type, alias="") {
    super();

    this.alias = alias;
    this.type = type;
  }

  getTypeName() {
    if (this.alias.length > 0) {
      return this.alias;
    }

    return `${this.type.getTypeName()}[]`;

  }
  toString() {
    return `ArrayType(${this.type}, ${this.alias})`;
  }
}