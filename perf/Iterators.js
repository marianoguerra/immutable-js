/* global Immutable */
describe('Iterators', () => {
  const sizes = [100, 1000, 10000];

  sizes.forEach((N) => {
    describe('size ' + N, () => {
      // Setup data structures
      const mapObj = {};
      const array = [];
      const nestedArray = [];
      const entries = [];
      for (let ii = 0; ii < N; ii++) {
        mapObj['k' + ii] = ii;
        array.push(ii);
        entries.push(['k' + ii, ii]);
        // Create some nesting for flatten: groups of 10
        if (ii % 10 === 0) {
          nestedArray.push([]);
        }
        nestedArray[nestedArray.length - 1].push(ii);
      }

      const map = Immutable.Map(mapObj);
      const list = Immutable.List(array);
      const nestedList = Immutable.List(
        nestedArray.map((a) => Immutable.List(a))
      );
      const fromEntriesList = Immutable.List(entries);

      // Map for-of (entries, values, keys)
      describe('Map for-of', () => {
        it('entries ' + N, () => {
          const iter = map.entries();
          while (!iter.next().done) {
            // drain
          }
        });

        it('values ' + N, () => {
          const iter = map.values();
          while (!iter.next().done) {
            // drain
          }
        });

        it('keys ' + N, () => {
          const iter = map.keys();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List filter iterator
      describe('List filter iterator', () => {
        const filtered = list.filter((v) => v % 2 === 0);

        it(N + ' items', () => {
          const iter = filtered.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List flatten iterator
      describe('List flatten iterator', () => {
        it(N + ' items', () => {
          const iter = nestedList.flatten().values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List skipWhile iterator
      describe('List skipWhile iterator', () => {
        const halfN = Math.floor(N / 2);
        const skipped = list.skipWhile((v) => v < halfN);

        it(N + ' items', () => {
          const iter = skipped.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List concat iterator
      describe('List concat iterator', () => {
        const halfN = Math.floor(N / 2);
        const list1 = list.slice(0, halfN);
        const list2 = list.slice(halfN);
        const concatenated = list1.concat(list2);

        it(N + ' items', () => {
          const iter = concatenated.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // FromEntries iterator
      describe('FromEntries iterator', () => {
        const fromEntries = fromEntriesList.fromEntrySeq();

        it(N + ' items', () => {
          const iter = fromEntries.entries();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List slice iterator
      describe('List slice iterator', () => {
        const quarterN = Math.floor(N / 4);
        const sliced = list.slice(quarterN, quarterN * 3);

        it(N + ' items', () => {
          const iter = sliced.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List takeWhile iterator
      describe('List takeWhile iterator', () => {
        const halfN = Math.floor(N / 2);
        const taken = list.takeWhile((v) => v < halfN);

        it(N + ' items', () => {
          const iter = taken.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List interpose iterator
      describe('List interpose iterator', () => {
        const interposed = list.interpose(0);

        it(N + ' items', () => {
          const iter = interposed.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // Chained lazy ops (filter -> map -> takeWhile)
      describe('Chained lazy ops', () => {
        const threeQuarterN = Math.floor((N * 3) / 4);
        const chained = list
          .filter((v) => v % 2 === 0)
          .map((v) => v * 2)
          .takeWhile((v) => v < threeQuarterN);

        it(N + ' items', () => {
          const iter = chained.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });
    });
  });
});
