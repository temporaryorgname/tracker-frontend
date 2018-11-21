export const formatDate = function(date) {
  if (typeof(date) === 'string') {
    return date;
  }
  var dateString = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate(); // Need to rebuild it to get rid of time zone funniness
  return dateString;
}

