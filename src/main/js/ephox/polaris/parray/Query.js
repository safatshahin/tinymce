define(
  'ephox.polaris.parray.Query',

  [
    'ephox.compass.Arr',
    'ephox.perhaps.Option'
  ],

  function (Arr, Option) {
    var get = function (parray, offset) {
      var unit = Arr.find(parray, function (x) {
        return x.start() <= offset && x.finish() >= offset;
      });

      return Option.from(unit);
    };

    return {
      get: get
    };
  }
);
