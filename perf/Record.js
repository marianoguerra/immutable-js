/* global Immutable */
describe('Record', () => {
  describe('builds from an object', () => {
    [2, 5, 10, 100, 1000].forEach((size) => {
      const defaults = {};
      const values = {};
      for (let ii = 0; ii < size; ii++) {
        defaults['x' + ii] = null;
        values['x' + ii] = ii;
      }

      const Rec = Immutable.Record(defaults);

      it('of ' + size, () => {
        Rec(values);
      });
    });
  });

  describe('update random using set()', () => {
    [2, 5, 10, 100, 1000].forEach((size) => {
      const defaults = {};
      const values = {};
      for (let ii = 0; ii < size; ii++) {
        defaults['x' + ii] = null;
        values['x' + ii] = ii;
      }

      const Rec = Immutable.Record(defaults);
      const rec = Rec(values);

      const key = 'x' + Math.floor(size / 2);

      it('of ' + size, () => {
        rec.set(key, 999);
      });
    });
  });

  describe('access random using get()', () => {
    [2, 5, 10, 100, 1000].forEach((size) => {
      const defaults = {};
      const values = {};
      for (let ii = 0; ii < size; ii++) {
        defaults['x' + ii] = null;
        values['x' + ii] = ii;
      }

      const Rec = Immutable.Record(defaults);
      const rec = Rec(values);

      const key = 'x' + Math.floor(size / 2);

      it('of ' + size, () => {
        rec.get(key);
      });
    });
  });

  describe('access random using property', () => {
    [2, 5, 10, 100, 1000].forEach((size) => {
      const defaults = {};
      const values = {};
      for (let ii = 0; ii < size; ii++) {
        defaults['x' + ii] = null;
        values['x' + ii] = ii;
      }

      const Rec = Immutable.Record(defaults);
      const rec = Rec(values);

      const key = 'x' + Math.floor(size / 2);

      it('of ' + size, () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        rec[key];
      });
    });
  });
});
