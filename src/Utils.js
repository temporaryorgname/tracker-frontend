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
