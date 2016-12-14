module.exports = {
  partition(array, size) {
    var resp = [];

    for(var i = 0; i < array.length; ) {
      var group = [];

      for(var j = 0; j < size && i < array.length; j++, i++) {
        group[j] = array[i];
      }

      resp.push(group);
    }

    return resp;
  }
};
