export const formatDate = function(date) {
  if (typeof(date) === 'string') {
    return date;
  }
  var dateString = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate(); // Need to rebuild it to get rid of time zone funniness
  return dateString;
}

export const parseQueryString = function(query) {
  if (query.length <= 1) {
    return {};
  }
  if (query[0] === '?') {
    query = query.substr(1);
  }
  return query.split('&')
    .reduce(function(acc, x) {
      var tokens = x.split('=');
      if (tokens.length === 2) {
        acc[tokens[0]] = tokens[1];
      }
      return acc;
    }, {});
}

export const stringifyPolygon = function(polygon) {
  console.log('Stringifying');
  console.log(polygon);
  if (typeof polygon === 'undefined' || polygon === null) {
    return null;
  }
  return JSON.stringify(polygon)
          .split('[').join('(')
          .split(']').join(')');
}

export const parsePolygon = function(polygon) {
  if (typeof polygon !== 'string') {
    return [];
  }
  return JSON.parse(
    polygon.split('(').join('[')
           .split(')').join(']')
  );
}

export const stringifyBox = function(box) {
  if (typeof box === 'undefined' || box === null) {
    return null;
  }
  return JSON.stringify(box)
          .split('[').join('(')
          .split(']').join(')');
}

export const parseBox = function(box) {
  if (typeof box !== 'string') {
    return null;
  }
  // Boxes are formatted as '(x,y),(x,y)', so we need to add brakets around that
  return JSON.parse(
    '['+box.split('(').join('[')
           .split(')').join(']')+']'
  );
}
