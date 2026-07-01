/* global Immutable */
describe('Map', () => {
  describe('builds from an object', () => {
    const obj2 = {};
    for (let ii = 0; ii < 2; ii++) {
      obj2['x' + ii] = ii;
    }

    it('of 2', () => {
      Immutable.Map(obj2);
    });

    const obj8 = {};
    for (let ii = 0; ii < 8; ii++) {
      obj8['x' + ii] = ii;
    }

    it('of 8', () => {
      Immutable.Map(obj8);
    });

    const obj32 = {};
    for (let ii = 0; ii < 32; ii++) {
      obj32['x' + ii] = ii;
    }

    it('of 32', () => {
      Immutable.Map(obj32);
    });

    const obj1024 = {};
    for (let ii = 0; ii < 1024; ii++) {
      obj1024['x' + ii] = ii;
    }

    it('of 1024', () => {
      Immutable.Map(obj1024);
    });
  });

  describe('builds from an array', () => {
    const array2 = [];
    for (let ii = 0; ii < 2; ii++) {
      array2[ii] = ['x' + ii, ii];
    }

    it('of 2', () => {
      Immutable.Map(array2);
    });

    const array8 = [];
    for (let ii = 0; ii < 8; ii++) {
      array8[ii] = ['x' + ii, ii];
    }

    it('of 8', () => {
      Immutable.Map(array8);
    });

    const array32 = [];
    for (let ii = 0; ii < 32; ii++) {
      array32[ii] = ['x' + ii, ii];
    }

    it('of 32', () => {
      Immutable.Map(array32);
    });

    const array1024 = [];
    for (let ii = 0; ii < 1024; ii++) {
      array1024[ii] = ['x' + ii, ii];
    }

    it('of 1024', () => {
      Immutable.Map(array1024);
    });
  });

  describe('builds from a List', () => {
    let list2 = Immutable.List().asMutable();
    for (let ii = 0; ii < 2; ii++) {
      list2 = list2.push(Immutable.List(['x' + ii, ii]));
    }
    list2 = list2.asImmutable();

    it('of 2', () => {
      Immutable.Map(list2);
    });

    let list8 = Immutable.List().asMutable();
    for (let ii = 0; ii < 8; ii++) {
      list8 = list8.push(Immutable.List(['x' + ii, ii]));
    }
    list8 = list8.asImmutable();

    it('of 8', () => {
      Immutable.Map(list8);
    });

    let list32 = Immutable.List().asMutable();
    for (let ii = 0; ii < 32; ii++) {
      list32 = list32.push(Immutable.List(['x' + ii, ii]));
    }
    list32 = list32.asImmutable();

    it('of 32', () => {
      Immutable.Map(list32);
    });

    let list1024 = Immutable.List().asMutable();
    for (let ii = 0; ii < 1024; ii++) {
      list1024 = list1024.push(Immutable.List(['x' + ii, ii]));
    }
    list1024 = list1024.asImmutable();

    it('of 1024', () => {
      Immutable.Map(list1024);
    });
  });

  describe('merge a map', () => {
    [2, 8, 32, 1024].forEach((size) => {
      const obj1 = {};
      const obj2 = {};
      for (let ii = 0; ii < size; ii++) {
        obj1['k' + ii] = '1_' + ii;
        obj2['k' + ii] = '2_' + ii;
      }

      const map1 = Immutable.Map(obj1);
      const map2 = Immutable.Map(obj2);

      it('of ' + size, () => {
        map1.merge(map2);
      });
    });
  });
});
