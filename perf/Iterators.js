/* global Immutable */
describe('Iterators', function () {
  var sizes = [100, 1000, 10000];

  sizes.forEach(function (N) {
    describe('size ' + N, function () {
      // Setup data structures
      var mapObj = {};
      var array = [];
      var nestedArray = [];
      var entries = [];
      for (var ii = 0; ii < N; ii++) {
        mapObj['k' + ii] = ii;
        array.push(ii);
        entries.push(['k' + ii, ii]);
        // Create some nesting for flatten: groups of 10
        if (ii % 10 === 0) {
          nestedArray.push([]);
        }
        nestedArray[nestedArray.length - 1].push(ii);
      }

      var map = Immutable.Map(mapObj);
      var list = Immutable.List(array);
      var nestedList = Immutable.List(
        nestedArray.map(function (a) {
          return Immutable.List(a);
        })
      );
      var fromEntriesList = Immutable.List(entries);

      // Map for-of (entries, values, keys)
      describe('Map for-of', function () {
        it('entries ' + N, function () {
          var iter = map.entries();
          while (!iter.next().done) {
            // drain
          }
        });

        it('values ' + N, function () {
          var iter = map.values();
          while (!iter.next().done) {
            // drain
          }
        });

        it('keys ' + N, function () {
          var iter = map.keys();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List filter iterator
      describe('List filter iterator', function () {
        var filtered = list.filter(function (v) {
          return v % 2 === 0;
        });

        it(N + ' items', function () {
          var iter = filtered.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List flatten iterator
      describe('List flatten iterator', function () {
        it(N + ' items', function () {
          var iter = nestedList.flatten().values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List skipWhile iterator
      describe('List skipWhile iterator', function () {
        var halfN = Math.floor(N / 2);
        var skipped = list.skipWhile(function (v) {
          return v < halfN;
        });

        it(N + ' items', function () {
          var iter = skipped.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List concat iterator
      describe('List concat iterator', function () {
        var halfN = Math.floor(N / 2);
        var list1 = list.slice(0, halfN);
        var list2 = list.slice(halfN);
        var concatenated = list1.concat(list2);

        it(N + ' items', function () {
          var iter = concatenated.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // FromEntries iterator
      describe('FromEntries iterator', function () {
        var fromEntries = fromEntriesList.fromEntrySeq();

        it(N + ' items', function () {
          var iter = fromEntries.entries();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List slice iterator
      describe('List slice iterator', function () {
        var quarterN = Math.floor(N / 4);
        var sliced = list.slice(quarterN, quarterN * 3);

        it(N + ' items', function () {
          var iter = sliced.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List takeWhile iterator
      describe('List takeWhile iterator', function () {
        var halfN = Math.floor(N / 2);
        var taken = list.takeWhile(function (v) {
          return v < halfN;
        });

        it(N + ' items', function () {
          var iter = taken.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // List interpose iterator
      describe('List interpose iterator', function () {
        var interposed = list.interpose(0);

        it(N + ' items', function () {
          var iter = interposed.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });

      // Chained lazy ops (filter -> map -> takeWhile)
      describe('Chained lazy ops', function () {
        var threeQuarterN = Math.floor((N * 3) / 4);
        var chained = list
          .filter(function (v) {
            return v % 2 === 0;
          })
          .map(function (v) {
            return v * 2;
          })
          .takeWhile(function (v) {
            return v < threeQuarterN;
          });

        it(N + ' items', function () {
          var iter = chained.values();
          while (!iter.next().done) {
            // drain
          }
        });
      });
    });
  });
});
