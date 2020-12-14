export class VarType {
  constructor(type) {
    this.type = type;
  }

  toString() {
    return `VarType(${this.type})`;
  }

  makeZero() {
    return 0.0;
  }

  getBaseName() {
    return this.type;
  }

  getTypeName() {
    return "" + this.type;
  }
}

export class ArrayType extends VarType {
  constructor(type, size, alias="") {
    super();

    if (typeof type === "string") {
      type = new VarType(type);
    }

    this.alias = alias;
    this.type = type;
    this.size = size;
  }

  makeZero() {
    let ret = [];

    for (let i=0; i<this.size; i++) {
      ret.push(this.type.makeZero());
    }

    return ret;
  }

  getTypeName() {
    if (this.alias.length > 0) {
      return this.alias;
    }

    return `${this.type.getTypeName()}[${this.size}]`;

  }

  getBaseName() {
    return typeof this.type === "string" ? this.type : this.type.getBaseName();
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

  makeZero() {
    return [];
  }

  getTypeName() {
    if (this.alias.length > 0) {
      return this.alias;
    }

    return `${this.type.getTypeName()}[]`;

  }

  getBaseName() {
    return typeof this.type === "string" ? this.type : this.type.getBaseName();
  }

  toString() {
    return `ArrayType(${this.type}, ${this.alias})`;
  }
}
