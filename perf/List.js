/* global Immutable */
describe('List', () => {
  describe('builds from array', () => {
    const array2 = [];
    for (let ii = 0; ii < 2; ii++) {
      array2[ii] = ii;
    }

    it('of 2', () => {
      Immutable.List(array2);
    });

    const array8 = [];
    for (let ii = 0; ii < 8; ii++) {
      array8[ii] = ii;
    }

    it('of 8', () => {
      Immutable.List(array8);
    });

    const array32 = [];
    for (let ii = 0; ii < 32; ii++) {
      array32[ii] = ii;
    }

    it('of 32', () => {
      Immutable.List(array32);
    });

    const array1024 = [];
    for (let ii = 0; ii < 1024; ii++) {
      array1024[ii] = ii;
    }

    it('of 1024', () => {
      Immutable.List(array1024);
    });
  });

  describe('pushes into', () => {
    it('2 times', () => {
      let list = Immutable.List();
      for (let ii = 0; ii < 2; ii++) {
        list = list.push(ii);
      }
    });

    it('8 times', () => {
      let list = Immutable.List();
      for (let ii = 0; ii < 8; ii++) {
        list = list.push(ii);
      }
    });

    it('32 times', () => {
      let list = Immutable.List();
      for (let ii = 0; ii < 32; ii++) {
        list = list.push(ii);
      }
    });

    it('1024 times', () => {
      let list = Immutable.List();
      for (let ii = 0; ii < 1024; ii++) {
        list = list.push(ii);
      }
    });
  });

  describe('pushes into transient', () => {
    it('2 times', () => {
      let list = Immutable.List().asMutable();
      for (let ii = 0; ii < 2; ii++) {
        list = list.push(ii);
      }
      list = list.asImmutable();
    });

    it('8 times', () => {
      let list = Immutable.List().asMutable();
      for (let ii = 0; ii < 8; ii++) {
        list = list.push(ii);
      }
      list = list.asImmutable();
    });

    it('32 times', () => {
      let list = Immutable.List().asMutable();
      for (let ii = 0; ii < 32; ii++) {
        list = list.push(ii);
      }
      list = list.asImmutable();
    });

    it('1024 times', () => {
      let list = Immutable.List().asMutable();
      for (let ii = 0; ii < 1024; ii++) {
        list = list.push(ii);
      }
      list = list.asImmutable();
    });
  });

  describe('some', () => {
    it('100 000 items', () => {
      const list = Immutable.List();
      for (let i = 0; i < 100000; i++) {
        list.push(i);
      }
      list.some((item) => item === 50000);
    });
  });
});
